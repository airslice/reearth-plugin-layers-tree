reearth.ui.show(`
[HTML]
`,{extended:false, width:40, height:40});

const randomColor = () => hslToHex(Math.floor(Math.random()*360),80,60)+'ff';

const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const handles = {};

// ===================================
// Layers
// ===================================
const processLayer = (layer) => {
  const l = {
    id: layer.id,
    extensionId: layer.extensionId,
    title: layer.title,
    isVisible: layer.isVisible
  }
  if(layer.children){
    l.children = layer.children.filter(l=> l.isVisible).map(cl => processLayer(cl));
  }
  return l;
}

handles.getLayersLayers = () => {
  reearth.ui.postMessage({
    title: 'layersLayersTree',
    value: reearth.layers.layers.filter(l=> l.isVisible).map(l=>processLayer(l))
  });
}

// ===================================
// Show & Hide
// ===================================
handles.showLayers = (payload) => {
  reearth.layers.show(payload.id);
}
handles.hideLayers = (payload) => {
  reearth.layers.hide(payload.id);
}

// ===================================
// Select Layer
// ===================================
handles.layersSelect = (payload) => {
  reearth.layers.select(payload.id);
}

// ===================================
// Resize
// ===================================
handles.resize = (payload) => {
  reearth.ui.resize(...payload.size);
}

// ===================================
// forceUpdate
// ===================================
handles.forceUpdate = () => {
  // this is a hack for fix not re-render when show layer
  reearth.visualizer.camera.flyTo(reearth.visualizer.camera.position);
}

// ===================================
// Message
// ===================================
reearth.on("message", msg => {
  // clog("message",msg);
  if (msg && msg.action) {
    handles[msg.action]?.(msg.payload);
  }
});

// ===================================
// Select
// ===================================
reearth.on("select", msg => {
  // clog("select",msg);
  reearth.ui.postMessage({
    title: 'selectedId',
    value: msg
  });
})

// ===================================
// Update
// ===================================
// reearth.on("update", ()=>{
//   clog("update",'');
// })

// ===================================
// Helper Console Log
// ===================================
const clog = (eventName,data) => {
  console.log(
    "%c Re:earth %c %s",
    "background-color:#FF9671;border-radius:2px;color:#000",
    "",
    "%c "+eventName+" %c %s",
    "background-color:#00D0B9;border-radius:2px;color:#000",
    "",
    JSON.stringify(data)
  );
};