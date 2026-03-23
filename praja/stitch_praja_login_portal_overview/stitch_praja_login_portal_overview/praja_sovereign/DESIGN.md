```markdown
# Design System Specification: Editorial Sovereignty

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sovereign Monolith."** 

This is not a standard government portal; it is a digital monument. We are moving away from the "template" aesthetic of boxed-in grids and 1px lines. Instead, we embrace a high-end editorial layout that mirrors the stability and proportions of the national flag. The experience should feel authoritative yet breathable, using expansive white space to denote transparency and heavy, grounded footers to denote stability.

### The Architectural Philosophy
- **Flag Proportions:** Layouts are divided into a horizontal tri-layer hierarchy. Saffron (`primary_container`) crowns the experience, White (`surface`) provides the intellectual core, and Green (`secondary`) acts as the bedrock.
- **Intentional Asymmetry:** While the colors are balanced, content placement should use "The Rule of the Void"—large, purposeful gaps in the grid to draw focus to high-level typography.
- **Stability through Mass:** We use heavy blocks of color rather than thin lines to define space.

---

## 2. Colors & Surface Philosophy
We strictly adhere to the tricolor sequence but elevate it through Material Design tonal mapping to ensure "The Sovereign Monolith" feels premium.

### The Color Palette
- **Saffron (Top/Action):** `primary_container` (#FF9933). Used for global headers, primary CTAs, and "Momentum" elements.
- **White (Center/Body):** `surface` (#F9F9F9) and `surface_container_lowest` (#FFFFFF). This is the canvas for all critical data and reading.
- **Green (Base/Foundation):** `secondary` (#056E00) and `on_secondary_container` (#067500). Used for footers, success states, and foundational structural blocks.
- **Navy Blue (Accents/Type):** `tertiary` (#4B53BC) and `on_surface` (#1A1C1C). Inspired by the Ashoka Chakra, this is reserved for high-contrast typography and interactive iconography.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. 
- To separate a header from a body, transition from `primary_container` to `surface`. 
- To separate a sidebar, use `surface_container_low` sitting on a `surface` background. 

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
1. **Base Layer:** `surface` (#F9F9F9).
2. **The "Document" Layer:** `surface_container_lowest` (#FFFFFF) for white cards or content blocks.
3. **The "Inset" Layer:** `surface_container_high` (#E8E8E8) for search bars or secondary content.

### Signature Textures (Glass & Gradient)
To avoid a flat, "paper-prototype" feel, use a subtle **Sovereign Gradient** on main Hero sections: A linear transition from `primary` (#8F4E00) at 0% to `primary_container` (#FF9933) at 100%. For floating navigation, use Glassmorphism (Background Blur: 20px) with a 60% opacity `surface_container_lowest` fill.

---

## 3. Typography: The Public Voice
We use **Public Sans** exclusively. It is a typeface that balances the neutrality of a civil servant with the sharpness of a modern tech leader.

- **Display-LG (3.5rem):** Reserved for singular, high-impact sovereign statements. Letter spacing: -0.02em.
- **Headline-MD (1.75rem):** Used for section titles. Always in `on_surface` (#1A1C1C) or `tertiary` (#4B53BC) for emphasis.
- **Title-SM (1rem):** Bold weight. Used for navigation and card headers to command authority.
- **Body-LG (1rem):** The "Reading" standard. High line-height (1.6) to ensure the "Sovereign" feel of breathability and clarity.
- **Label-MD (0.75rem):** Uppercase with +0.05em tracking for secondary metadata or Ashoka-inspired accents.

---

## 4. Elevation & Depth: Tonal Layering
We reject the 2010s "drop shadow" era. Hierarchy is achieved through **Tonal Stacking**.

### The Layering Principle
Instead of a shadow, place a `surface_container_lowest` card on a `surface_container` background. The subtle shift in grey-tone provides a sophisticated, "quiet" elevation.

### Ambient Shadows
Where floating elements (like Modals) are required:
- **Shadow:** 0px 12px 32px rgba(0, 0, 128, 0.06). Note the Navy Blue tint in the shadow—this mimics natural light passing through a "Navy" lens, making the shadow feel integrated with the brand.

### The "Ghost Border" Fallback
If a container requires a boundary (e.g., input fields), use the `outline_variant` token at **20% opacity**. It should be a suggestion of a border, not a fence.

---

## 5. Components

### Buttons (The Momentum Elements)
- **Primary:** `primary_container` (#FF9933) fill with `on_primary_container` (#693800) text. Sharp corners (Roundedness: `sm` - 0.125rem) to maintain a rigid, official feel.
- **Secondary:** Transparent fill with a `tertiary` (#4B53BC) "Ghost Border."
- **States:** Hover states should not darken; they should shift to a subtle Glassmorphism overlay (White at 10% opacity).

### Cards & Lists (The Editorial Block)
- **Prohibition:** No divider lines. Use `spacing.8` (2.75rem) to separate list items. 
- **Structure:** Content should be "Flush Left" to create a strong vertical axis, reinforcing the feeling of stability.

### Input Fields
- Background: `surface_container_low`. 
- Bottom Border Only: Instead of a full box, use a 2px bottom-accent in `tertiary` (Navy) when focused, mimicking the underline of a signature.

### The Sovereign Footer
- Always `secondary` (#056E00). 
- Massive vertical padding (`spacing.20`). 
- Typography in `on_secondary` (#FFFFFF). This acts as the "Earth" of the design, grounding all pages.

---

## 6. Do's and Don'ts

### Do
- **Do** use the Saffron/White/Green hierarchy strictly in vertical order for page-level layouts.
- **Do** use `spacing.12` and `spacing.16` for "Breathing Room" around important text.
- **Do** use Navy Blue for all icons to reference the Ashoka Chakra's presence throughout the system.

### Don't
- **Don't** use 100% black typography. Use `on_surface` (#1A1C1C) for a softer, more premium feel.
- **Don't** use rounded corners (`xl` or `full`) on primary containers. "Sovereign" means structure; keep edges to `sm` or `md`.
- **Don't** use Green for top-level headers. Green is the foundation; Saffron is the crown.
- **Don't** use "Standard Blue" for links. Use the Navy Blue (`tertiary`) token.

---
**Director's Note:** This system is about the power of what is *not* there. Let the white space speak for the integrity of the institution, and let the colors provide the weight of history.```