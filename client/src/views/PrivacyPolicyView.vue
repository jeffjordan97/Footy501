<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue';
import AppContainer from '@/components/layout/AppContainer.vue';

const lastUpdated = '11 April 2026';
const contactEmail = 'jeffrey.jordan@dizplai.com';
</script>

<template>
  <AppLayout>
    <AppContainer size="sm" class="py-12">
      <article class="prose prose-invert max-w-none">
        <h1 class="font-display text-3xl mb-2">Privacy Policy</h1>
        <p class="text-text-muted text-sm mb-8">Last updated: {{ lastUpdated }}</p>

        <section class="flex flex-col gap-8 text-sm text-text-muted leading-relaxed">
          <!-- 1. Who we are -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">1. Who we are</h2>
            <p>
              Footy 501 is operated by Jeffrey Jordan ("we", "us", "our"). We are the data controller
              responsible for your personal data. If you have questions about this policy or your data,
              contact us at
              <a :href="`mailto:${contactEmail}`" class="text-primary-light hover:underline">{{ contactEmail }}</a>.
            </p>
          </div>

          <!-- 2. What data we collect -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">2. What data we collect</h2>
            <p class="mb-3">We collect the minimum data needed to run the game:</p>
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-2 text-text font-medium">Data</th>
                  <th class="text-left py-2 text-text font-medium">When</th>
                  <th class="text-left py-2 text-text font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border/50">
                  <td class="py-2">Display name</td>
                  <td class="py-2">Guest sign-up or Google sign-in</td>
                  <td class="py-2">Identify you on leaderboards and in-game</td>
                </tr>
                <tr class="border-b border-border/50">
                  <td class="py-2">Google user ID</td>
                  <td class="py-2">Google sign-in only</td>
                  <td class="py-2">Authenticate your account across sessions</td>
                </tr>
                <tr class="border-b border-border/50">
                  <td class="py-2">Game scores and history</td>
                  <td class="py-2">Each game played</td>
                  <td class="py-2">Run the game, display results and leaderboards</td>
                </tr>
                <tr class="border-b border-border/50">
                  <td class="py-2">Daily challenge attempts</td>
                  <td class="py-2">Daily challenges</td>
                  <td class="py-2">Prevent duplicate plays, populate leaderboard</td>
                </tr>
                <tr>
                  <td class="py-2">IP address</td>
                  <td class="py-2">Every request (server logs)</td>
                  <td class="py-2">Security, abuse prevention, infrastructure operation</td>
                </tr>
              </tbody>
            </table>
            <p class="mt-3">
              We do <strong class="text-text">not</strong> collect your email address, payment information,
              or location data. We do not use cookies. We do not run analytics or advertising.
            </p>
          </div>

          <!-- 3. Legal basis -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">3. Legal basis for processing</h2>
            <p>
              We process your data under <strong class="text-text">GDPR Article 6(1)(b) — contract performance</strong>.
              When you create an account and play the game, processing your data is necessary to deliver the
              service you requested. We do not rely on consent as a legal basis for core game functionality.
            </p>
          </div>

          <!-- 4. How long we keep your data -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">4. How long we keep your data</h2>
            <ul class="list-disc list-inside flex flex-col gap-1">
              <li><strong class="text-text">Active accounts:</strong> Data is retained while your account is active.</li>
              <li><strong class="text-text">Deleted accounts:</strong> When you request deletion, your account is
                deactivated immediately and permanently erased after 14 days. You can cancel deletion by
                signing back in during this period.</li>
              <li><strong class="text-text">Leaderboard entries:</strong> After account deletion, your leaderboard
                entries are anonymised (display name replaced with "Deleted User") to preserve game integrity.</li>
              <li><strong class="text-text">Server logs:</strong> IP addresses in server logs are retained for up to
                30 days for security purposes.</li>
            </ul>
          </div>

          <!-- 5. Third parties -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">5. Third parties</h2>
            <p class="mb-2">We share data with:</p>
            <ul class="list-disc list-inside flex flex-col gap-1">
              <li><strong class="text-text">Google</strong> (authentication only) — When you sign in with Google,
                your browser communicates directly with Google's OAuth servers. We receive your Google user ID
                and display name. Google's privacy policy applies to their processing of your data.</li>
              <li><strong class="text-text">Amazon Web Services (AWS)</strong> — Our servers and database are hosted
                on AWS in the EU (Ireland, eu-west-1). AWS acts as a data processor under their standard
                Data Processing Addendum.</li>
            </ul>
            <p class="mt-2">We do not sell, rent, or share your data with any other third parties.</p>
          </div>

          <!-- 6. Local storage -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">6. Local storage on your device</h2>
            <p class="mb-2">
              We use your browser's localStorage (not cookies) for strictly necessary purposes only:
            </p>
            <ul class="list-disc list-inside flex flex-col gap-1">
              <li><strong class="text-text">Authentication token</strong> — Keeps you signed in between visits.</li>
              <li><strong class="text-text">Daily challenge result</strong> — Caches your score locally so you can
                see it after playing.</li>
              <li><strong class="text-text">Guest identifier</strong> — Prevents duplicate daily challenge plays
                for guest users.</li>
            </ul>
            <p class="mt-2">
              All localStorage usage is strictly necessary under the ePrivacy Directive Article 5(3) and
              UK PECR Regulation 6. No consent banner is required or shown.
            </p>
          </div>

          <!-- 7. Your rights -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">7. Your rights</h2>
            <p class="mb-2">Under GDPR and UK GDPR, you have the right to:</p>
            <ul class="list-disc list-inside flex flex-col gap-1">
              <li><strong class="text-text">Access</strong> your data — Use the "Export My Data" button in
                <router-link to="/account" class="text-primary-light hover:underline">Account Settings</router-link>,
                or email us.</li>
              <li><strong class="text-text">Rectify</strong> your data — Edit your display name in Account Settings.</li>
              <li><strong class="text-text">Erase</strong> your data — Delete your account in Account Settings
                (14-day grace period, then permanent).</li>
              <li><strong class="text-text">Data portability</strong> — Download your data as a JSON file via
                Account Settings.</li>
              <li><strong class="text-text">Restrict processing</strong> or <strong class="text-text">object</strong>
                — Contact us at
                <a :href="`mailto:${contactEmail}`" class="text-primary-light hover:underline">{{ contactEmail }}</a>.</li>
            </ul>
            <p class="mt-2">We will respond to any request within one calendar month.</p>
          </div>

          <!-- 8. Complaints -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">8. Complaints</h2>
            <p>
              If you are unhappy with how we handle your data, you have the right to lodge a complaint with a
              supervisory authority. In the UK, this is the
              <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" class="text-primary-light hover:underline">
                Information Commissioner's Office (ICO)
              </a>.
              In the EU, contact the data protection authority in your country of residence.
            </p>
          </div>

          <!-- 9. Children -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">9. Children</h2>
            <p>
              Footy 501 is intended for users aged 13 and over. We do not knowingly collect data from
              children under 13. If you believe a child under 13 has created an account, please contact us
              and we will delete it promptly.
            </p>
          </div>

          <!-- 10. Changes -->
          <div>
            <h2 class="font-display text-lg text-text mb-2">10. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The "last updated" date at the top of the page
              will change. For significant changes, we will notify signed-in users.
            </p>
          </div>
        </section>
      </article>
    </AppContainer>
  </AppLayout>
</template>
