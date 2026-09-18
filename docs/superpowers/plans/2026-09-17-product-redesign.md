# Product led website and direct app entry

The user requested a complete website redesign because the previous visual presentation did not explain the product clearly. The product website must show sending, collecting and managing files. The separate application should open at login or the authenticated dashboard. New content and screenshots are English; GitHub is now public (visibility updated September 18, 2026).

Design: ivory and cobalt editorial layout, hands on send/collect walkthrough, visible screenshot stories, workspace overview, infrastructure diagram and searchable documentation. The glass artwork appears only within real application screenshots. The walkthrough is explicitly illustrative and never uploads files.

Implementation: static HTML/CSS/native JavaScript under site/, no framework or new runtime. Existing documentation stays accurate while its navigation and presentation change. The application retains its existing authentication, first access and public transfer routes.

Validation: responsive browser checks at 1440/768/390/320, all six walkthrough stages, trusted clipboard copy/paste, keyboard interaction, documentation search/empty/reset/link behavior, internal links and live asset hashes. Application lint/types/tests, production build, anonymous/authenticated root navigation, first setup, public links and existing data preservation.

Deployment: test the application image on isolated data, take a consistent live backup, update the existing local Compose image, verify health and data. Publish an immutable static release on Contabo, retain previous release, push the repository and record status.
