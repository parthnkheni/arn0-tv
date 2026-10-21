/*
 * Photos: a grid of the wallpaper photos, and a full-screen viewer with a slideshow.
 *
 * The viewer shows each photo's `full` image — the whole photo, letterboxed and without the
 * readability scrim, made by scripts/prepare-wallpapers.mjs — and falls back to the wallpaper
 * itself for catalog entries made before that existed. Like the screen saver it keeps two
 * layers, loads the next photo on the hidden one and crossfades with opacity only, so stepping
 * through never flashes an empty screen and nothing repaints per frame.
 *
 * The caption fades out a few seconds after each change, so nothing static sits over a photo
 * for long; any key brings it back with the remote hints.
 */
(function () {
    'use strict';

    var COLS = 4;
    var SLIDE_MS = 10 * 1000;
    var CAPTION_MS = 4000;

    var $ = UI.$;
    var el = UI.el;
    var KEY = UI.KEY;

    var layers = [];
    var front = 0;              // which of the two photo layers is showing
    var token = 0;
    var index = 0;
    var playing = false;
    var slideTimer = null;
    var captionTimer = null;

    function list() { return Wallpaper.list(); }

    function source(w) { return w.full || w.file; }

    // ---------- Grid

    function tiles() { return UI.children($('photos-grid')); }

    function renderGrid() {
        var grid = $('photos-grid');
        grid.innerHTML = '';
        UI.resetScroll(grid);
        list().forEach(function (w, i) {
            var t = el('div', 'photo');
            var img = new Image();
            img.src = w.thumb;
            t.appendChild(img);
            t._item = { index: i };
            grid.appendChild(t);
        });
    }

    function gridFocus(t) {
        var w = list()[t._item.index];
        $('photos-count').textContent = w.title + ' · ' + (t._item.index + 1) + ' of ' + list().length;
    }

    // ---------- Viewer

    function renderKeys() {
        var keys = $('pv-keys');
        keys.innerHTML = '';
        [['◀ ▶', 'Browse'], ['OK', playing ? 'Pause' : 'Slideshow'], ['Green', 'Set as background'], ['Back', 'Photos']]
            .forEach(function (h) {
                var group = el('div', 'hint');
                group.appendChild(el('span', 'hint-key', h[0]));
                group.appendChild(el('span', 'hint-label', h[1]));
                keys.appendChild(group);
            });
    }

    // withKeys: a key was pressed, so show what the keys do; a slideshow step shows only the title.
    function showCaption(withKeys) {
        var w = list()[index];
        $('pv-title').textContent = w.title;
        $('pv-count').textContent = (index + 1) + ' / ' + list().length + (w.credit ? ' · ' + w.credit : '');
        if (withKeys) renderKeys();
        $('pv-keys').classList.toggle('hidden', !withKeys);
        $('pv-caption').classList.remove('pv-quiet');
        clearTimeout(captionTimer);
        captionTimer = setTimeout(function () { $('pv-caption').classList.add('pv-quiet'); }, CAPTION_MS);
    }

    // A token abandons a load that finishes after the next step, or after the viewer has closed.
    function display(i, withKeys) {
        var l = list();
        index = ((i % l.length) + l.length) % l.length;
        var w = l[index];
        var t = ++token;
        showCaption(withKeys);
        var img = new Image();
        img.onload = function () {
            if (t !== token || !UI.isVisible('photo-view')) return;
            var back = layers[1 - front];
            back.style.backgroundImage = 'url("' + source(w) + '")';
            back.style.opacity = '1';
            layers[front].style.opacity = '0';
            front = 1 - front;
        };
        img.onerror = function () { DevLog.log('Photo failed to load: ' + source(w)); };
        img.src = source(w);
    }

    // Restarting the countdown on every manual step keeps a fresh photo up for the full interval.
    function setPlaying(on) {
        playing = on;
        clearInterval(slideTimer);
        if (on) slideTimer = setInterval(function () { display(index + 1, false); }, SLIDE_MS);
    }

    function step(by) {
        if (window.Sound) Sound.play('move');
        display(index + by, true);
        if (playing) setPlaying(true);
    }

    function togglePlaying() {
        setPlaying(!playing);
        showCaption(true);
        if (playing) UI.toast('Slideshow · every ' + SLIDE_MS / 1000 + ' s');
    }

    // Green: hold this photo as the Home wallpaper, the same choice as Settings ▸ Background ▸ Photo.
    function setBackground() {
        var w = list()[index];
        var p = Prefs.get().wallpaper;
        p.photo = w.key;
        p.mode = 'photo';
        Prefs.save();
        Wallpaper.apply();
        UI.toast('Background: ' + w.title);
        showCaption(true);
    }

    function openViewer(i) {
        front = 0;
        layers.forEach(function (l) { l.style.opacity = '0'; });
        UI.show('photo-view');
        display(i, true);
    }

    function closeViewer() {
        setPlaying(false);
        clearTimeout(captionTimer);
        token++;
        // Dropping the images releases two full-screen textures on a 2 GB device.
        layers.forEach(function (l) {
            l.style.opacity = '0';
            l.style.backgroundImage = '';
        });
        UI.show('photos', { back: true });
        UI.focusOn(tiles()[index]);
    }

    function registerViews() {
        UI.register('photos', {
            el: $('photos'),
            rows: function () { return UI.chunk(tiles(), COLS); },
            onShow: function (opts) { if (!opts.back) renderGrid(); },
            onFocus: gridFocus,
            activate: function (item) { openViewer(item.index); },
            hints: [['OK', 'View'], ['Back', 'Home']]
        });

        UI.register('photo-view', {
            el: $('photo-view'),
            hints: [],
            rows: function () { return []; },
            // Every key but Back is the viewer's, so a colour key cannot leave the slideshow
            // running behind another screen.
            onKey: function (k) {
                if (k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE) return false;
                if (k === KEY.LEFT) step(-1);
                else if (k === KEY.RIGHT) step(1);
                else if (k === KEY.ENTER) togglePlaying();
                else if (k === KEY.GREEN || k === KEY.G) setBackground();
                else showCaption(true);
                return true;
            },
            onBack: function () { closeViewer(); return true; }
        });
    }

    function init() {
        layers = [$('pv-photo-a'), $('pv-photo-b')];
        registerViews();
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && UI.isVisible('photo-view')) closeViewer();
        });
    }

    window.Gallery = {
        init: init,
        open: function () { UI.show('photos'); }
    };
})();
