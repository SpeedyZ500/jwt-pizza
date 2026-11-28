# Incident: 2026-11-28 13:36:27

## Summary

Between the hours of **13:36** and **14:03** on **2026-11-28**, **1** user encountered the chaos monkey who would not allow them to purchase pizzas. This event was triggered by scheduled chaos testing which founds its way into the production environment. Chaos testing was activated on **2026-11-27** for testing the alerting system and incident response of staff.

The resolution was delayed by the logging system redacting the response url. An update was pushed at **13:47:34** to resolve the redaction issue, but it failed to resolve it, at **13:53:09**, the second update to prevent redaction was pushed. At **13:56:55** the link was followed to disable the chaos. at **13:57:46** there were no more errors from the pizza factory. The incident lasted **27 minutes**.

This **SEV-1** incident affected **everyone**, including developers, who were unable to disable chaos until the fix was pushed, and no one was able to purchase JWT pizzas until chaos was disabled.

## Detection

This incident was detected when the **On-Call** alert was triggered and **JWT Pizza** team were emailed at **13:37:00** \(Which is to say I was emailed\). Response was delayed by **15 minutes** due to the redaction of urls in the original system.

Next during the resolution phase, the **Pizza Errors** alert was triggered and **JWT Pizza** team were emailed at **13:50:00**.

A **Testing API key** will be requested and implemented for use on testing environments for the future when the testing key is received by myself as the **sole developer** on this project.

## Impact

> [!NOTE]
> Describe how the incident impacted internal and external users during the incident. Include how many support cases were raised.

For **27 minutes** between **15:36** UTC and **14:03** UTC on **11/28/26**, our chaos testing started and the chaos monkey targeted the production environment our users experienced this incident.

This incident affected 1 customers (100% OF JWT Pizza USERS), who experienced the inability to order pizza.

**0** SUPPORT TICKETS AND **0** SOCIAL MEDIA POSTS were submitted.

## Timeline

All times are UTC.

- _13:36_ - chaos testing started
- _13:37_ - On-Call alerted that errors were occurring
- _13:42_ - found the disable chaos links were redacted but were being reported
- _13:47_ - first update to try and not redact links occurred
- _13:50_ - Pizza Failure reported failures occurring at the Pizza Factory
- _13:53_ - Second update pushed successfully preventing links from being redacted
- _13:56_ - link followed to disable chaos
- _13:57_ - Users once again able to order pizzas, no more errors after this
- _14:02_ - Pizza Failure reported that the fix was working
- _14:03_ - **On-Call** reported http responses as healthy

## Response

> [!NOTE]
> Who responded to the incident? When did they respond, and what did they do? Note any delays or obstacles to responding.

After receiving an email at **13:37** UTC, DevOps Engineer \(Spencer\) came online at 13:39 UTC in Pizza Dashboard.

This system was redacting critical info to the so a second alert was sent at **13:50 UTC** to DevOps Engineer \(Spencer\).

## Root cause

Chaos testing escaped and the monkeys targeted the production environment. Logging was redacting too much information and delayed response.

## Resolution

Service was restored by not redacting reporting and chaos fields in the error logs, and following the link to end the chaos.

Future responses will be faster due to reduced redaction of logs, while preserving privacy and security.

## Prevention

This is the first incident of this kind for my application. Do not allow chaos testing to occur in production.

## Action items

1. Get a testing key for the development environment.
2. Deploy testing key for development environments.
3. Redact only sensitive information
