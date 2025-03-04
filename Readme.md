# Reader Mode

A minimal Chrome Extension for any customizations that I can't do with the regular settings.

### Features
- Enables smooth WASD-Scrolling on all websites
- Replaces the New Tab page with a completely blank page

## WASD-Scrolling

The extension injects a script into any website you visit to enable scrolling with the w, a, s, and d keys, as well as arrow keys.
The scrolling is smooth (as opposed to the default stuttering scrolling with arrow keys) by running at the full FPS that
your browser supports (See [requestAnimationFrame]).

Scrolling can be sped up by holding shift, and will automatically be disabled if any input-like elements are active.

[requestAnimationFrame()]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

## New Tab Page

Replaces the new tab page with one that is purely grey, in a color that is neither too bright nor too dark, ideal if you want to
keep a browser open in the background but don't want the active page to use too many resources or to distract with animations/ads.
