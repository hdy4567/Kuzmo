/**
 * ⚡ [v29.0] Offscreen Canvas Worker (Turbo Core)
 * Decouples rendering from Main-Thread for zero-lag drawing.
 */

let canvas, ctx;
let lastX, lastY;

self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            canvas = payload.canvas;
            ctx = canvas.getContext('2d', { desynchronized: true });
            break;

        case 'RESIZE':
            canvas.width = payload.width;
            canvas.height = payload.height;
            break;

        case 'START':
            lastX = payload.x;
            lastY = payload.y;
            break;

        case 'MOVE':
            if (!ctx) return;
            const { x, y, brushColor, brushSize, velocity } = payload;
            
            // 🖋️ [v29.0 PRO-INK] C++ Style Dynamic Stroke Physics
            const midX = (lastX + x) / 2;
            const midY = (lastY + y) / 2;
            
            // Calculate dynamic width with damping (Samsung Notes Style)
            const targetWidth = Math.max(0.5, brushSize - (velocity * 0.45));
            ctx.lineWidth = (ctx.lineWidth * 0.4) + (targetWidth * 0.6); 
            
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = brushColor;
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.quadraticCurveTo(lastX, lastY, midX, midY);
            ctx.stroke();

            lastX = x;
            lastY = y;
            break;

        case 'CLEAR':
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            break;
    }
};
