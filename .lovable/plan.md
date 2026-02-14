

## Fix: Tabs overflow and page scroll in Chemical Project Layout

### Problem
The project layout has 12 tabs that overflow horizontally, and the entire page requires vertical scrolling because the layout doesn't properly fill the available viewport height. The `h-full` on the outer div doesn't work because the parent `main` in `AppLayout` doesn't establish a fixed height context.

### Solution

Two changes across two files:

### 1. `src/components/layout/AppLayout.tsx`
- Change the `main` element to use `overflow-hidden` and a fixed height calculation so child components can properly fill the space with their own scroll.
- Replace `flex-1 p-6 overflow-auto` with `flex-1 overflow-hidden` (remove padding -- padding will be handled by each page individually, or we keep a wrapper).
- Actually, the simplest fix: make main use `h-[calc(100vh-3.5rem)]` and `overflow-hidden` so the ChemProjectLayout can fill it with `h-full`.

### 2. `src/pages/chemicals/ChemProjectLayout.tsx`
- Make the TabsList scrollable horizontally with proper overflow styling (hide scrollbar, allow scroll).
- Reduce tab size and spacing to fit better.
- Consider showing only icons on smaller screens or using a compact layout.
- Ensure the content area (`flex-1 overflow-auto`) takes remaining height without causing page scroll.

### Technical Details

**AppLayout.tsx** -- line 71:
```tsx
<main className="flex-1 overflow-hidden">
  <Outlet />
</main>
```
Remove `p-6` from main (pages that need padding already have their own). Add `overflow-hidden` to prevent double scrollbars.

**ChemProjectLayout.tsx** -- changes:
- Root div: change `h-full` to `h-full` (keep) but ensure it works with the new parent.
- Header: reduce `py-4` to `py-2` and `mb-3` to `mb-2` to save vertical space.
- TabsList: add proper horizontal scroll with hidden scrollbar CSS, and reduce trigger padding:
  ```tsx
  <TabsList className="w-full justify-start overflow-x-auto flex-nowrap scrollbar-hide">
  ```
- Add a small CSS utility `.scrollbar-hide` (via Tailwind plugin or inline style) to hide the scrollbar while keeping scroll functional.
- Reduce icon size in tabs from `w-3.5 h-3.5` to `w-3 h-3` and use even smaller text.

These changes will make the header compact, the tabs horizontally scrollable without a visible scrollbar, and the content area will fill the remaining viewport height with its own internal scroll.

