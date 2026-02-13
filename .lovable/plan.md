
# Replace Logo with Uploaded Skill Arena Image

## What will change
The uploaded Skill Arena logo will replace the current icon-based logo in all locations across the app.

## Locations to update

1. **Sidebar (`src/components/AppSidebar.tsx`)** - Replace the Swords icon + text block with the logo image
2. **Landing page (`src/pages/Landing.tsx`)** - Replace the Swords icon + text in both the left branding panel and the mobile header

## Steps

1. Copy the uploaded image to `src/assets/skill-arena-logo.png`
2. Update **AppSidebar.tsx**: Replace the `Swords` icon div with an `<img>` tag importing the logo, sized appropriately for the sidebar (~40px height)
3. Update **Landing.tsx**:
   - Left panel: Replace the large Swords icon + "Skill Arena" heading with the logo image (~64px height)
   - Mobile header: Replace the small Swords icon + "CodeClash" text with a smaller logo image

## Technical details
- Import the image as an ES6 module: `import skillArenaLogo from "@/assets/skill-arena-logo.png"`
- The logo has a dark/transparent background which suits the app's dark theme
- Text labels like "Skill Arena" and "AI Powered Skill Evolution" in the sidebar can be kept or removed since the logo already contains that text -- they will be removed to avoid duplication
