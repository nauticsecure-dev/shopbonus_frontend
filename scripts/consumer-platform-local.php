<?php

// Isolated real-HTTP consumer acceptance. Synthetic fixtures never reach providers.
$backend = dirname(__DIR__, 2).'/shopbonus_backend';
require $backend.'/vendor/autoload.php';

use App\Enums\OfferAcquisition;
use App\Enums\OfferStatus;
use App\Enums\VoucherOrigin;
use App\Enums\WalletUnit;
use App\Models\Offer;
use App\Models\OfferVersion;
use App\Models\User;
use App\Models\Voucher;
use App\Models\VoucherClaim;
use App\Models\VoucherCode;
use App\Models\Webshop;
use App\Models\WebshopConnection;
use App\Models\WebshopOrder;
use App\Models\WebshopPublicProfile;
use App\Services\Discovery\DiscoveryCache;
use App\Services\Offers\OfferService;
use App\Services\Vouchers\VoucherInventory;
use App\Services\Wallet\WalletService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Concerns\CreatesActiveWebshops;

$database = $backend.'/storage/framework/consumer-platform-local.sqlite';
$probe = ($argv[1] ?? '') === 'probe';
if (! $probe) {
    if (file_exists($database)) {
        throw new RuntimeException('Isolated fixture already exists; inspect before rerunning.');
    }
    touch($database);
    foreach ([
        'APP_ENV' => 'local', 'APP_DEBUG' => 'false', 'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)),
        'APP_CONFIG_CACHE' => $backend.'/storage/framework/consumer-local-no-config.php',
        'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => $database, 'DB_URL' => '',
        'SESSION_DRIVER' => 'database', 'SESSION_COOKIE' => 'shopbonus_consumer_local',
        'SESSION_DOMAIN' => '', 'SESSION_SECURE_COOKIE' => 'false', 'SESSION_SAME_SITE' => 'lax',
        'CACHE_STORE' => 'database', 'QUEUE_CONNECTION' => 'database', 'MAIL_MAILER' => 'array',
        'BROADCAST_CONNECTION' => 'null', 'SANCTUM_STATEFUL_DOMAINS' => '127.0.0.1:3340',
        'CORS_ALLOWED_ORIGINS' => 'http://127.0.0.1:3340', 'CORS_SUPPORTS_CREDENTIALS' => 'true',
        'FRONTEND_URL' => 'http://127.0.0.1:3340', 'API_RATE_LIMIT_PER_MINUTE' => '10000',
        'LEGAL_TERMS_VERSION' => 'consumer-local-terms', 'LEGAL_PRIVACY_VERSION' => 'consumer-local-privacy',
        'TELESCOPE_ENABLED' => 'false', 'NIGHTWATCH_ENABLED' => 'false', 'PULSE_ENABLED' => 'false',
    ] as $key => $value) {
        putenv($key.'='.$value);
        $_ENV[$key] = $_SERVER[$key] = $value;
    }
}
$app = require $backend.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if ($app->configurationIsCached() || realpath(config('database.connections.sqlite.database')) !== realpath($database)) {
    throw new RuntimeException('Refusing to run outside the isolated fixture.');
}

if ($probe) {
    $action = $argv[2] ?? '';
    if ($action === 'code') {
        $email = $argv[3] ?? '';
        foreach (DB::table('jobs')->orderByDesc('id')->get() as $job) {
            $payload = json_decode($job->payload, true, flags: JSON_THROW_ON_ERROR);
            $serialized = $payload['data']['command'];
            $command = unserialize(str_starts_with($serialized, 'O:') ? $serialized : decrypt($serialized));
            $notification = $command->notification ?? null;
            if (! $notification instanceof App\Notifications\EmailVerificationCode && ! $notification instanceof App\Notifications\EmailChangeCode) continue;
            $notifiable = $command->notifiables->first();
            $address = $notifiable instanceof User ? $notifiable->email : $notifiable->routeNotificationFor('mail');
            if ($address === $email) {
                $code = $notification->code;
                $details = ['notification' => $notification::class, 'code_length' => strlen($code), 'numeric' => (bool) preg_match('/^\d{6}$/', $code)];
                if ($notification instanceof App\Notifications\EmailChangeCode) {
                    $pending = App\Models\EmailChangeRequest::where('new_email', $email)->latest('id')->firstOrFail();
                    $details['matches_pending'] = hash_equals($pending->code_hash, hash_hmac('sha256', 'email-change|'.$pending->user_id.'|'.$pending->new_email.'|'.$code, (string) config('app.key')));
                    $details['expired'] = $pending->expires_at->isPast();
                    file_put_contents(dirname(__DIR__).'/docs/consumer-platform-local-email-diagnostic.json', json_encode($details, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
                }
                if (! $details['numeric']) throw new RuntimeException('Invalid queued code format.');
                echo $code;
                exit;
            }
        }
        throw new RuntimeException('No synthetic queued verification code.');
    }
    if ($action === 'fund') {
        $user = User::where('email', 'consumer@platform-local.test')->sole();
        $wallets = app(WalletService::class);
        $points = $wallets->consumerWallet($user, WalletUnit::Points);
        $wallets->credit($points, 400, 'consumer-local-points', neverExpires: true);
        $wallets->reserve($points, 100, 'consumer-local-hold');
        $wallets->addPending($points, 1000, 'consumer-local-pending');
        $wallets->credit($wallets->consumerWallet($user), 1234, 'consumer-local-eur', neverExpires: true);
    } elseif ($action === 'fixture') {
        echo json_encode([
            'offers' => Offer::with('currentVersion')->where('webshop_id', WebshopPublicProfile::where('slug', 'consumer-local-shop')->sole()->webshop_id)->get()->mapWithKeys(fn ($o) => [$o->currentVersion->name => $o->slug]),
            'claims' => VoucherClaim::with('voucher')->get()->mapWithKeys(fn ($c) => [$c->status === 'cancelled' ? 'revoked' : ($c->expires_at->isPast() ? 'expired' : (WebshopOrder::findOrFail($c->voucher->source_order_id)->customer_email === 'other@platform-local.test' ? 'mismatch' : 'valid')) => $c->token]),
        ], JSON_THROW_ON_ERROR);
    } elseif ($action === 'pause') {
        app(OfferService::class)->transition(Offer::whereHas('currentVersion', fn ($q) => $q->where('name', 'Local points voucher'))->sole(), OfferStatus::Paused);
    } elseif ($action === 'cache-clear') {
        DiscoveryCache::flush();
    } elseif ($action === 'dispatch-notifications') {
        app(App\Services\Notifications\NotificationDispatcher::class)->drain();
    } elseif ($action === 'registration-throttle-clear') {
        app(Illuminate\Cache\RateLimiter::class)->clear(md5('identity-register'.'register-ip:127.0.0.1'));
    } elseif ($action === 'throttle-clear') {
        Illuminate\Support\Facades\Cache::forget('claims:127.0.0.1');
        Illuminate\Support\Facades\Cache::forget('claims:127.0.0.1:timer');
    } elseif ($action === 'wallet-down') {
        Schema::rename('wallets', 'consumer_local_wallets_unavailable');
    } elseif ($action === 'wallet-up') {
        if (Schema::hasTable('consumer_local_wallets_unavailable')) Schema::rename('consumer_local_wallets_unavailable', 'wallets');
    } elseif ($action === 'evidence') {
        $diagnostic = dirname(__DIR__).'/docs/consumer-platform-local-email-diagnostic.json';
        if (! file_exists($diagnostic)) {
            $pending = App\Models\EmailChangeRequest::latest('id')->first();
            $details = ['pending_exists' => $pending !== null, 'attempt_count' => $pending?->attempt_count, 'expired' => $pending?->expires_at->isPast()];
            foreach (DB::table('jobs')->orderByDesc('id')->get() as $job) {
                $payload = json_decode($job->payload, true, flags: JSON_THROW_ON_ERROR);
                $serialized = $payload['data']['command'];
            $command = unserialize(str_starts_with($serialized, 'O:') ? $serialized : decrypt($serialized));
                if (($command->notification ?? null) instanceof App\Notifications\EmailChangeCode) {
                    $code = $command->notification->code;
                    $details['queued_code_length'] = strlen($code);
                    $details['queued_code_numeric'] = (bool) preg_match('/^\d{6}$/', $code);
                    $details['queued_code_matches_pending'] = $pending !== null && hash_equals($pending->code_hash, hash_hmac('sha256', 'email-change|'.$pending->user_id.'|'.$pending->new_email.'|'.$code, (string) config('app.key')));
                    $details['notifiable_class'] = $command->notifiables->first()::class;
                    break;
                }
            }
            file_put_contents($diagnostic, json_encode($details, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        }
        echo json_encode([
            'shop_count' => Webshop::count(), 'offer_count' => Offer::count(), 'code_count' => VoucherCode::count(),
            'checkouts' => DB::table('voucher_checkouts')->count(),
            'points_debits' => DB::table('wallet_ledger_entries')->join('wallets', 'wallets.id', '=', 'wallet_ledger_entries.wallet_id')->where('wallets.unit', 'points')->where('wallet_ledger_entries.type', 'debit')->count(),
            'claimed_invitations' => VoucherClaim::where('status', 'claimed')->count(),
            'denied_audits' => DB::table('audit_events')->where('outcome', 'denied')->count(),
        ], JSON_THROW_ON_ERROR);
    }
    exit;
}

$server = null;
$failed = false;
try {
    Artisan::call('migrate', ['--force' => true]);
    User::factory()->create(['email' => 'other@platform-local.test', 'password' => 'Local-only-2026!', 'first_name' => 'Other']);
    $owner = User::factory()->create();
    $contactReviewer = User::factory()->create();
    foreach ([$owner, $contactReviewer] as $contactAdmin) {
        $contactAdmin->platformRoles()->create(['role' => 'super_admin', 'granted_via' => 'console', 'granted_at' => now()]);
    }
    $settings = app(App\Services\Admin\PlatformSettings::class);
    $settings->publish($settings->submit($settings->draft($owner, 'public.support_email', 'support@platform-local.test', 'Synthetic local contact recipient'), $owner), $contactReviewer, 'Independent synthetic contact review');
    $cms = app(App\Services\Cms\CmsService::class);
    $homepage = $cms->ensureHomepage($owner->id);
    foreach (['nl', 'en'] as $locale) {
        $state = app(App\Services\Cms\HomepageCmsService::class)->adminState($locale);
        $content = $state['draft'];
        $content['hero']['heading'] = $locale === 'nl' ? 'Lokale consumentenacceptatie' : 'Local consumer acceptance';
        $cms->saveDraft($homepage, $locale, $content, $state['draft_revision'], null, $owner->id);
        $cms->publish($homepage, $locale, $owner->id);
    }
    App\Models\CookiePolicy::create(['version' => 'consumer-local-1', 'status' => 'published', 'created_by' => $owner->id, 'published_by' => $owner->id, 'published_at' => now(), 'requires_reconsent' => true,
        'categories' => array_map(fn ($key) => ['key' => $key, 'required' => $key === 'necessary', 'trackers' => []], ['necessary', 'preferences', 'analytics', 'marketing']),
        'texts' => ['de' => ['title' => 'Cookies', 'body' => 'Lokale Cookie-Auswahl.', 'accept_all' => 'Alle akzeptieren', 'reject_optional' => 'Optionale ablehnen', 'customize' => 'Anpassen'], 'nl' => ['title' => 'Cookies', 'body' => 'Lokale cookiekeuzes.', 'accept_all' => 'Alles accepteren', 'reject_optional' => 'Optionele weigeren', 'customize' => 'Aanpassen'], 'en' => ['title' => 'Cookies', 'body' => 'Local cookie choices.', 'accept_all' => 'Accept all', 'reject_optional' => 'Reject optional', 'customize' => 'Customize']],
    ]);
    $fixture = new class {
        use CreatesActiveWebshops;
        public function shop(User $owner): Webshop { return $this->activeWebshop($owner, ['name' => 'Consumer Local Shop']); }
    };
    $shop = $fixture->shop($owner);
    WebshopPublicProfile::create(['webshop_id' => $shop->id, 'slug' => 'consumer-local-shop', 'display_name' => $shop->name, 'short_description' => 'Synthetic local acceptance catalog', 'published' => true, 'first_published_at' => now()]);
    DB::table('webshop_public_categories')->insert(['webshop_id' => $shop->id, 'category' => 'home_living']);
    $member = $shop->memberships()->sole()->setRelation('webshop', $shop);
    foreach (['Local points voucher' => [250, 'active', null, 8], 'Local expensive voucher' => [999, 'active', null, 2], 'Local paused voucher' => [250, 'paused', null, 2], 'Local expired voucher' => [250, 'active', now()->subDay(), 2], 'Local sold out voucher' => [250, 'active', null, 0]] as $name => [$price, $status, $end, $stock]) {
        $offer = app(OfferService::class)->transition(app(OfferService::class)->create($member, OfferAcquisition::WalletPurchase, ['name' => $name, 'discount_type' => 'fixed', 'discount_value' => 1000, 'price_points' => $price, 'redemption_validity_days' => 30]), OfferStatus::Active);
        if ($status === 'paused') app(OfferService::class)->transition($offer, OfferStatus::Paused);
        if ($end) DB::table('offer_versions')->where('id', $offer->current_version_id)->update(['ends_at' => $end]);
        for ($j = 0; $j < $stock; $j++) {
            $code = Str::random(16);
            VoucherCode::create(['webshop_id' => $shop->id, 'offer_id' => $offer->id, 'code' => $code, 'code_hash' => VoucherCode::hashFor($shop->id, $code), 'code_last4' => substr($code, -4)]);
        }
    }
    // Eligible-event fixture follows the existing ConsumerPlatformE2ETest helper.
    $reward = app(OfferService::class)->transition(app(OfferService::class)->create($member, OfferAcquisition::MerchantReward, ['name' => 'Local activation reward', 'discount_type' => 'fixed', 'discount_value' => 500, 'redemption_validity_days' => 30]), OfferStatus::Active);
    $connection = WebshopConnection::create(['webshop_id' => $shop->id, 'platform' => 'woocommerce', 'method' => 'webhook', 'status' => 'connected', 'webhook_token' => Str::random(40), 'created_by' => $owner->id]);
    foreach (['valid', 'expired', 'revoked', 'mismatch'] as $kind) {
        $order = WebshopOrder::create(['webshop_id' => $shop->id, 'connection_id' => $connection->id, 'platform' => 'woocommerce', 'external_order_id' => 'local-'.$kind, 'customer_email' => $kind === 'mismatch' ? 'other@platform-local.test' : 'consumer@platform-local.test', 'customer_email_hash' => WebshopOrder::emailHash($kind === 'mismatch' ? 'other@platform-local.test' : 'consumer@platform-local.test'), 'payment_status' => 'paid', 'ingestion_status' => 'complete', 'amount_minor' => 7500, 'currency' => 'EUR', 'paid_at' => now(), 'placed_at' => now()]);
        $code = Str::random(16);
        VoucherCode::create(['webshop_id' => $shop->id, 'offer_id' => $reward->id, 'code' => $code, 'code_hash' => VoucherCode::hashFor($shop->id, $code), 'code_last4' => substr($code, -4)]);
        $voucher = app(VoucherInventory::class)->reserve($reward->fresh(), VoucherOrigin::Answer24Claim, 'consumer-local-'.$kind, $order);
        $token = Str::random(24);
        VoucherClaim::create(['webshop_id' => $shop->id, 'voucher_id' => $voucher->id, 'token_hash' => VoucherClaim::hashToken($token), 'token' => $token, 'status' => $kind === 'revoked' ? 'cancelled' : 'open', 'expires_at' => $kind === 'expired' ? now()->subMinute() : now()->addDays(30)]);
    }
    DB::transaction(fn () => Model::withoutEvents(function () use ($owner) {
        for ($i = 1; $i < 200; $i++) {
            $shop = Webshop::factory()->approved()->create(['created_by' => $owner->id]);
            WebshopPublicProfile::create(['webshop_id' => $shop->id, 'slug' => 'benchmark-local-'.$i, 'display_name' => 'Benchmark Local Shop '.$i, 'short_description' => 'Synthetic scale fixture', 'published' => true, 'first_published_at' => now()]);
            DB::table('webshop_public_categories')->insert(['webshop_id' => $shop->id, 'category' => $i % 2 ? 'fashion' : 'home_living']);
            for ($j = 0; $j < 5; $j++) {
                $offer = Offer::create(['webshop_id' => $shop->id, 'acquisition' => 'wallet_purchase', 'status' => 'active', 'slug' => "benchmark-local-{$i}-{$j}", 'created_by' => $owner->id, 'activated_at' => now()]);
                $version = OfferVersion::create(['offer_id' => $offer->id, 'version' => 1, 'name' => 'Benchmark local offer', 'discount_type' => 'fixed', 'discount_value' => 1000, 'price_points' => 250, 'created_by' => $owner->id, 'ends_at' => $j === 2 ? now()->subDay() : null]);
                $offer->forceFill(['current_version_id' => $version->id])->save();
                for ($k = 0; $k < 2; $k++) {
                    $code = "LOCAL-{$i}-{$j}-{$k}";
                    VoucherCode::create(['webshop_id' => $shop->id, 'offer_id' => $offer->id, 'code' => $code, 'code_hash' => VoucherCode::hashFor($shop->id, $code), 'code_last4' => substr($code, -4)]);
                }
            }
        }
    }));
    DiscoveryCache::flush();
    echo "Isolated consumer fixture ready (200 shops); no provider calls.\n";
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
    if (! $socket) throw new RuntimeException('Cannot reserve loopback port.');
    $address = stream_socket_get_name($socket, false);
    fclose($socket);
    $log = dirname(__DIR__, 2).'/qa-evidence/consumer-platform-local-api.log';
    $opcache = dirname(PHP_BINARY).'/ext/php_opcache.dll';
    $phpFlags = file_exists($opcache) ? ['-d', 'zend_extension='.$opcache, '-d', 'opcache.enable_cli=1', '-d', 'opcache.validate_timestamps=1'] : [];
    $server = proc_open([PHP_BINARY, '-d', 'xdebug.mode=off', ...$phpFlags, '-S', $address, '-t', $backend.'/public', $backend.'/public/index.php'], [0 => ['pipe', 'r'], 1 => ['file', $log, 'w'], 2 => ['file', $log, 'a']], $pipes, $backend);
    if (! is_resource($server)) throw new RuntimeException('Cannot start isolated API.');
    putenv('CONSUMER_LOCAL_API=http://'.$address);
    putenv('CONSUMER_LOCAL_PHP='.PHP_BINARY);
    $browser = proc_open(['node', 'scripts/consumer-platform-local.cjs'], [0 => STDIN, 1 => STDOUT, 2 => STDERR], $browserPipes, dirname(__DIR__));
    if (! is_resource($browser) || proc_close($browser) !== 0) throw new RuntimeException('Local consumer checks failed; inspect sanitized evidence.');
} catch (Throwable $error) {
    $failed = true;
    fwrite(STDERR, 'Isolated acceptance failed: '.$error::class.' at '.basename($error->getFile()).':'.$error->getLine()."\n");
} finally {
    if (is_resource($server)) { proc_terminate($server); proc_close($server); }
    $app->make('db')->disconnect();
    foreach ([$database, $database.'-wal', $database.'-shm'] as $file) {
        if (file_exists($file)) unlink($file);
    }
}
exit($failed ? 1 : 0);
