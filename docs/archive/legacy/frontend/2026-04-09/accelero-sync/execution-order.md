# Execution Order

## Group A: Core Shell First

Build these first:

1. Dashboard
2. Project Detail
3. Settings

Reason:
- these pages define the design language for the rest of the app

## Group B: Secondary Product Surfaces

Build these second:

4. Client Portal
5. Generate / Stitch page

Reason:
- important surfaces, but should inherit the shell quality from Group A

## Group C: New Sub-Surfaces

Plan now, implement after approval:

6. Research
7. Strategy
8. Assets
9. Project-level Integrations

Reason:
- these likely need new routes and component structure
- they are not just styling updates

## Do Not Spend This Pass On

10. Landing
11. Auth
12. Task Detail
13. Project Creation Modal

Reason:
- lower priority than the main logged-in shell and project workspace
