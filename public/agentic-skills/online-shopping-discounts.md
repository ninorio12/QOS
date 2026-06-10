---
name: online-shopping-discounts
description: "Use when finding, validating, or comparing online discount codes, coupons, referral offers, newsletter incentives, and official sale pricing before a user buys from an ecommerce site."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [shopping, coupons, ecommerce, discounts, validation]
    related_skills: []
---

# Online Shopping Discounts

## Overview

Use this skill to help the user pay less on an ecommerce purchase without inventing or forwarding unverified promo codes. The core rule is: **search broadly, validate in a real cart before reporting, and clearly separate verified savings from untested leads.**

## When to Use

- User asks for a promo code, coupon, voucher, discount, referral, or cheaper way to buy from a specific website.
- User explicitly asks to test codes before sending them.
- User wants “funnel hacking” around newsletter/referral/cart abandonment offers.

Do not use for illegal bypasses, payment fraud, fake accounts at scale, credential abuse, or exploiting vulnerabilities.

## Workflow

1. **Check the merchant directly first**
   - Open the official site.
   - Look for active banners, sale pages, product-category discounts, outlet/clearance, student/pro/trade pages, referral pages, newsletter popups, and free-shipping thresholds.
   - Record exact visible terms and expiry dates.

2. **Search coupon sources broadly**
   - Search web results for: `<brand> promo code`, `<brand> discount code`, `<brand> voucher`, `code promo <brand>`, `<brand> referral`, `<brand> newsletter discount`.
   - Try coupon aggregators, deal forums, Reddit, brand social pages, affiliate blogs, and local-language searches.
   - Treat scraped uppercase strings from blocked pages as noise unless a page clearly labels them as coupons.

3. **Create a harmless cart test**
   - Add a representative product to cart.
   - Do not place an order or enter payment details unless the user explicitly instructs.
   - Navigate to the promo-code field and test each candidate.

4. **Validate and classify**
   - **Verified works:** code accepted and discount visible in cart/checkout.
   - **Rejected:** site says invalid/expired/not applicable.
   - **Unclear:** requires login, email verification, region, minimum spend, or specific product category.
   - **Better than coupon:** official sale beats all codes or codes do not stack.

5. **Try legitimate funnel levers**
   - Newsletter signup discount.
   - Referral invite if the user can supply an eligible referrer or email.
   - Account creation / first-order offer.
   - Abandoned-cart email: add to cart, log in if user approves, wait for merchant follow-up.
   - Trade/pro/student discounts if the user qualifies.
   - Compare locales/currencies only when it does not violate merchant terms or add hidden shipping/tax costs.

6. **Report only what is useful**
   - Lead with the best verified way to pay less.
   - Include rejected codes only if the user asked for the audit trail.
   - Never present an untested code as working.

## Response Shape

Keep it short and practical:

- **Best verified saving:** `<code or offer>` — `<discount>` — `<conditions>`.
- **Tested and rejected:** `<codes>`.
- **Best fallback:** official sale/newsletter/referral/cart-abandonment.
- **Caveat:** if login/email/product-specific testing blocked verification.

## Common Pitfalls

1. **Sending fake coupon-list codes.** Coupon sites often expose expired or fabricated codes. Test in cart first.
2. **Ignoring official sale pricing.** The best discount may already be applied and may not stack with coupons.
3. **Over-trusting search snippets.** Snippets can say “verified” while the page is stale or blocked.
4. **Stopping after Google blocks.** Retry with Bing, Brave, direct coupon URLs, local-language queries, deal forums, and the merchant’s own pages.
5. **Accidentally buying.** Stop before final payment/submit order unless the user explicitly authorizes purchase.
6. **Confusing coupon validity with applicability.** A valid code may only apply to a region, product category, minimum spend, first order, or logged-in account.

## Verification Checklist

- [ ] Official site checked for current sale and terms.
- [ ] Candidate codes came from more than one source type where possible.
- [ ] A cart/checkout test was attempted without placing an order.
- [ ] Working, rejected, and unclear offers are separated.
- [ ] The final answer does not claim a code works unless the site accepted it.
