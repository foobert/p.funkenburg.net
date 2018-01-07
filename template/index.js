function loadImages() {
    document.querySelectorAll('#grid .album img').forEach(img => {
        img.onload = () => {
            img.className = img.width / img.height > 1
                ? 'wide'
                : 'tall';
        };
        img.src = img.dataset.src;
    });
}

window.onload = () => {
    loadImages();
}
