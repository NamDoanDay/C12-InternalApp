# PONYTAIL - FULL FRONTEND MODERNIZATION
## CSS TO TAILWIND + LIBRARY INTEGRATION + CLEAN CODE REFACTOR

Act as a Senior Frontend Architect, Senior UI Engineer and Web Performance Engineer.

Use the installed Ponytail skills and follow their actual instructions throughout this task.

My project currently uses HTML and CSS.

I want to modernize the entire frontend using Tailwind CSS, appropriate modern libraries, and comprehensive Clean Code Refactoring.

The objective is to produce a modern, lightweight, maintainable, performant and scalable frontend.

IMPORTANT: Do not assume the project uses React, Vue, Vite, Next.js or any specific framework. First inspect the actual project.

# PHASE 1: COMPLETE PROJECT ANALYSIS

Analyze the entire repository.

Identify:

- Existing technology stack.
- HTML, CSS and JavaScript files.
- Current architecture.
- Build system and package manager.
- Existing dependencies.
- Existing UI components and design patterns.
- CSS duplication.
- Unused CSS.
- Complex selectors.
- Inline styles.
- Repeated HTML structures.
- Responsive breakpoints.
- Existing JavaScript interactions.
- Performance bottlenecks.
- Accessibility problems.

Do not modify any files during this phase.

Produce a detailed technical audit.

# PHASE 2: FRONTEND ARCHITECTURE DESIGN

Design a maintainable frontend architecture.

Requirements:

- Clear separation of concerns.
- Reusable UI components where justified.
- Consistent naming conventions.
- Logical file organization.
- Centralized design tokens.
- Maintainable CSS architecture.
- Minimal unnecessary abstractions.
- Avoid over-engineering.

Do not introduce a JavaScript framework unless there is a strong technical justification.

# PHASE 3: TAILWIND CSS MIGRATION

Migrate the existing CSS to Tailwind CSS.

Requirements:

1. Select the appropriate Tailwind version.
2. Use official installation and integration methods.
3. Configure the existing build system correctly.
4. Configure source detection.
5. Establish design tokens.
6. Standardize colors, typography, spacing and breakpoints.
7. Convert existing CSS to Tailwind utilities.
8. Use responsive utilities appropriately.
9. Use state variants such as hover, focus and active.
10. Avoid unnecessary arbitrary values.
11. Avoid duplicate utility classes.
12. Keep minimal custom CSS when Tailwind is not suitable.

Do not blindly convert every CSS rule.

Use reusable patterns for repeated complex styles.

Preserve the original visual design.

# PHASE 4: MODERN LIBRARY INTEGRATION

Evaluate the following libraries and alternatives:

## Icons
- Lucide

## UI Components
- DaisyUI
- Flowbite
- Headless UI

## Animation
- Motion
- Native CSS animations

## Formatting
- Prettier

## CSS Quality
- Stylelint

## Browser Testing
- Playwright

## Accessibility
- axe-core

For each library evaluate:

- Actual project compatibility.
- Bundle size.
- Dependency overhead.
- Performance.
- Maintenance status.
- Accessibility.
- Functional overlap with existing code.

Choose only the libraries that provide measurable value.

Do not install unnecessary or overlapping libraries.

Request approval before adding new dependencies.

# PHASE 5: HTML/CSS/JAVASCRIPT CLEAN CODE REFACTOR

Apply Ponytail principles.

HTML:
- Improve semantic HTML5 structure.
- Remove unnecessary wrapper elements.
- Remove duplicated markup.
- Improve accessibility.
- Simplify nested structures.

CSS:
- Remove duplicate CSS.
- Remove proven unused selectors.
- Reduce unnecessary custom CSS.
- Remove redundant declarations.
- Simplify complex selectors.
- Standardize design tokens.
- Eliminate unnecessary !important.
- Prefer Tailwind utilities.

JavaScript:
- Remove proven dead code.
- Reduce duplicate logic.
- Simplify unnecessary complexity.
- Improve event handling where appropriate.
- Preserve all existing functionality.

Architecture:
- Reduce unnecessary abstractions.
- Prefer native browser features.
- Avoid unnecessary dependencies.
- Keep code readable.
- Avoid over-engineering.

# PHASE 6: PERFORMANCE OPTIMIZATION

Optimize:

- CSS bundle size.
- JavaScript bundle size.
- DOM complexity.
- Rendering performance.
- Image loading.
- Font loading.
- Network requests.
- Layout shifts.
- Animation performance.
- Unnecessary dependencies.

Measure performance before and after changes.

Do not claim improvements without benchmark evidence.

# PHASE 7: VISUAL AND FUNCTIONAL REGRESSION TESTING

Verify:

- All existing pages.
- Desktop layouts.
- Tablet layouts.
- Mobile layouts.
- Navigation.
- Buttons.
- Forms.
- Dropdowns.
- Modals.
- Hover and focus states.
- Animations.
- JavaScript interactions.
- Accessibility.
- Browser console.
- Production build.

Compare screenshots before and after migration.

The existing design must remain visually consistent unless I explicitly approve a redesign.

# PHASE 8: FINAL CLEANUP

After successful migration:

- Remove obsolete CSS.
- Remove unused dependencies.
- Remove temporary files.
- Remove redundant configurations.
- Update documentation.
- Update installation instructions.
- Update project architecture documentation.

Never delete original CSS before verifying the Tailwind replacement.

# STRICT RULES

1. Preserve existing business logic.
2. Preserve existing functionality.
3. Preserve the original UI design.
4. Preserve responsive behavior.
5. Do not break existing JavaScript selectors.
6. Do not remove accessibility features.
7. Do not add unnecessary dependencies.
8. Do not introduce unnecessary frameworks.
9. Do not rewrite the entire application without justification.
10. Follow YAGNI and KISS.
11. Prefer standard browser capabilities.
12. Make small, reversible changes.
13. Keep Git history intact.

# IMPLEMENTATION WORKFLOW

Work incrementally.

For each page or module:

1. Analyze existing implementation.
2. Identify dependencies.
3. Prepare migration plan.
4. Migrate to Tailwind.
5. Refactor Clean Code.
6. Integrate approved libraries.
7. Test visual appearance.
8. Test functionality.
9. Run build and automated tests.
10. Review Git diff.

Do not migrate the entire application in one uncontrolled operation.

# FINAL REPORT

Provide:

- Final architecture.
- Tailwind configuration.
- Libraries selected and why.
- Files changed.
- CSS removed.
- HTML improvements.
- Clean Code improvements.
- Performance measurements.
- Test results.
- Remaining technical debt.

# STARTING INSTRUCTION

Start with PHASE 1 only.

Do not install dependencies.
Do not modify source code.
Do not delete files.

First analyze the project and present the complete migration plan for my approval.