// ===================================
// Resize Height
// ===================================
const resizeHeight = () => {
  const maxHeight = parent.innerHeight - 105;
  const contentHeight = document.getElementById('wrapper').clientHeight;
  const height = contentHeight > maxHeight ? maxHeight: contentHeight;
  parent.postMessage({
    action: 'resize',
    payload: {
      size: [300, height, undefined],
    },
  }, "*");
}

// ===================================
// Minimize
// ===================================
let mini = false;
const toggleMini = () => {
  if(mini){
    resizeHeight();
    document.body.classList.remove('mini');
  }else{
    parent.postMessage({
      action: 'resize',
      payload: {
        size: [40, 40, undefined],
      },
    }, "*");
    document.body.classList.add('mini');
  }
  mini = !mini;
}
document.getElementById('mini-widget').addEventListener('click',toggleMini);

toggleMini();

// ===================================
// Visible
// ===================================
const findParentFromFlatternTree = (id) => {
  let parentId = undefined;
  Object.keys(flattenTree).forEach(pid =>{
    if(flattenTree[pid].includes(id)) parentId = pid;
  })
  return parentId;
}
const processVisible = (id, show) => {
  // self
  let action = undefined;
  if(!show){
    action = 'hideLayers';
  }else{
    let pvisible = true;
    let pid;
    let cid = id;
    do{
      pid = findParentFromFlatternTree(cid);
      if(pid){
        cid = pid;
        if(hiddenLayers.has(pid)){
          pvisible = false;
        }
      }
    }while(pid && pvisible);
    if(pvisible) action = 'showLayers';
  }

  if(action){
    parent.postMessage({
      action,
      payload: {
        id,
      },
    }, "*");
    // children
    if(flattenTree[id]){
      flattenTree[id].forEach(cid=>{
        if(!show || (show && !hiddenLayers.has(cid))){
          processVisible(cid, show);
        }
      })
    }
  }
  
}
const hiddenLayers = new Set();
const toggleVisible = (layerId) => {
  if(hiddenLayers.has(layerId)){
    // show
    hiddenLayers.delete(layerId);
    document.getElementById('layer-visible-'+layerId).classList.remove('invisible');
    processVisible(layerId, true);
    // hack update
    parent.postMessage({
      action: 'forceUpdate',
    }, "*");
  }else{
    // hide
    hiddenLayers.add(layerId);
    document.getElementById('layer-visible-'+layerId).classList.add('invisible');
    processVisible(layerId, false);
  }
}

// ===================================
// Fold
// ===================================
const unFolded = new Set();
const toggleFold = (id) => {
  const tar = document.getElementById(id);
  if(unFolded.has(id)){
    // fold
    tar.nextSibling.classList.remove('unfolded');    
    unFolded.delete(id);
  }else{
    tar.nextSibling.classList.add('unfolded');
    unFolded.add(id);
  }
  resizeHeight();
}

// ===================================
// Layers Tree
// ===================================
const flattenTree = {};
const processLayer = (l, tar) => {
  const wrap = document.createElement('div');
  wrap.className = 'layer-wrap';
  wrap.id = 'layer-wrap-'+l.id;

  const item = document.createElement('div');
  item.className = 'layer-item';
  item.id = l.id;
  
  const itemType = document.createElement('a');
  itemType.className = 'layer-type';
  let type = l.extensionId ? l.extensionId : 'folder';
  if(l.children){
    type = 'folder';
  }
  itemType.innerHTML = icons[type] ?? '';
  itemType.setAttribute('type', type);

  const itemTitle = document.createElement('a');
  itemTitle.className = 'layer-title';
  itemTitle.innerHTML = l.title;
  itemTitle.id = 'layer-title-'+l.id;
  itemTitle.setAttribute('layerId', l.id);

  const itemVisible = document.createElement('a');
  itemVisible.className = 'layer-visible';
  itemVisible.innerHTML = icons['visible']+icons['invisible'];
  itemVisible.id = 'layer-visible-'+l.id;
  if(!l.isVisible){
    itemVisible.className = 'layer-visible disabled invisible';
  } 
  else{
    itemVisible.addEventListener('click',()=>{
      toggleVisible(l.id)
    });
  }

  item.appendChild(itemType);
  item.appendChild(itemTitle);
  item.appendChild(itemVisible);
  wrap.appendChild(item);

  flattenTree[l.id] = []; 

  if(l.children){
    const folder = document.createElement('div');
    folder.className = 'layer-folder';
    l.children.forEach(c => {
      processLayer(c, folder);
      flattenTree[l.id].push(c.id);
    })
    wrap.appendChild(folder);
  }
  tar.appendChild(wrap);
}
const rebuildLayersTree = (layers) => {
  if(layers){
    const ctn = document.getElementById('layers-get-layers-tree');
    ctn.innerHTML = ""; 
    layers.forEach(l=>{
      processLayer(l,ctn);
    })
  }
  // select event
  const layerTitles = document.getElementsByClassName('layer-title');
  Array.prototype.forEach.call(layerTitles,(ele)=>{
    ele.addEventListener('click',(e)=>{
      parent.postMessage({
        action: "layersSelect",
        payload: {
          id: ele.getAttribute('layerId'),
        }
      }, "*");
    })
  })
  if(selectedId){
    setCurrentLayerHighlight(selectedId);
  }
  // fold event
  const layerTypes = document.getElementsByClassName('layer-type');
  Array.prototype.forEach.call(layerTypes, (ele)=>{
    if(ele.getAttribute('type') === 'folder'){
      ele.addEventListener('click',(e)=>{
        toggleFold(ele.parentNode.id);
      })
    }
  })
}
// highlight
const setCurrentLayerHighlight = (id) => {
  const layerItems = document.getElementsByClassName('layer-item');
  Array.prototype.forEach.call(layerItems,(ele)=>{
    ele.className = 'layer-item';
  })
  const cur = document.getElementById(id);
  if(cur) cur.className = 'layer-item active';
}

// ===================================
// Receive Message
// ===================================
let selectedId = null;

addEventListener("message", e => {
  // clog(e.data);
  if (e.source !== parent || !e.data.title) return;
  switch(e.data.title){
    case 'layersLayersTree':
      rebuildLayersTree(e.data.value);
      break;
    case 'selectedId':
      // highlight layers tree
      if(selectedId !== e.data.value){
        setCurrentLayerHighlight(e.data.value);
      }
      selectedId = e.data.value;
      break;
    default:
      break;
  }
});

// ===================================
// Helper Console Log
// ===================================
const clog = (data) => {
  console.log(
    "%c Widget %c %s",
    "background-color:#FFAA71;border-radius:2px;color:#000",
    "",
    "%c message %c %s",
    "background-color:#00D0B9;border-radius:2px;color:#000",
    "",
    "%c "+data.title+" %c %s",
    "background-color:#0081C0;border-radius:2px;color:#fff",
    "",
    JSON.stringify(data.value)
  );
};

// ===================================
// Widget INIT
// ===================================
parent.postMessage({
  action: "getLayersLayers",
}, "*");

// console.log(
//   "%c Widget %c %s",
//   "background-color:#FFAA71;border-radius:2px;color:#000",
//   "",
//   "%c INIT %c",
//   "background-color:#00D0B9;border-radius:2px;color:#000",
//   ""
// );

// ===================================
// icons
// ===================================
const icons = {
  marker:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/primMarkerIcon.fe2fd4a6.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M14.0292 22.7354C15.1183 21.8682 16.207 20.8883 17.226 19.8127C20.1976 16.676 22 13.3716 22 10C22 4.47715 17.5228 0 12 0C6.47715 0 2 4.47715 2 10C2 13.3716 3.8024 16.676 6.77405 19.8127C7.793 20.8883 8.88175 21.8682 9.97082 22.7354C10.3526 23.0394 10.7078 23.3081 11.0278 23.5392C11.2228 23.68 11.3649 23.7784 11.4453 23.8321C11.7812 24.056 12.2188 24.056 12.5547 23.8321C12.6351 23.7784 12.7772 23.68 12.9722 23.5392C13.2922 23.3081 13.6474 23.0394 14.0292 22.7354ZM15.774 18.4373C14.8242 19.4398 13.8036 20.3584 12.7833 21.1708C12.5048 21.3926 12.2423 21.5936 12 21.7726C11.7577 21.5936 11.4952 21.3926 11.2167 21.1708C10.1964 20.3584 9.17575 19.4398 8.22595 18.4373C5.5726 15.6365 4 12.7534 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10C20 12.7534 18.4274 15.6365 15.774 18.4373ZM12 14C9.79086 14 8 12.2091 8 10C8 7.79086 9.79086 6 12 6C14.2091 6 16 7.79086 16 10C16 12.2091 14.2091 14 12 14ZM14 10C14 11.1046 13.1046 12 12 12C10.8954 12 10 11.1046 10 10C10 8.89543 10.8954 8 12 8C13.1046 8 14 8.89543 14 10Z" fill="currentColor"></path>'+
'<mask id="mask0-1684" mask-type="alpha" maskUnits="userSpaceOnUse" x="2" y="0" width="20" height="24">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M14.0292 22.7354C15.1183 21.8682 16.207 20.8883 17.226 19.8127C20.1976 16.676 22 13.3716 22 10C22 4.47715 17.5228 0 12 0C6.47715 0 2 4.47715 2 10C2 13.3716 3.8024 16.676 6.77405 19.8127C7.793 20.8883 8.88175 21.8682 9.97082 22.7354C10.3526 23.0394 10.7078 23.3081 11.0278 23.5392C11.2228 23.68 11.3649 23.7784 11.4453 23.8321C11.7812 24.056 12.2188 24.056 12.5547 23.8321C12.6351 23.7784 12.7772 23.68 12.9722 23.5392C13.2922 23.3081 13.6474 23.0394 14.0292 22.7354ZM15.774 18.4373C14.8242 19.4398 13.8036 20.3584 12.7833 21.1708C12.5048 21.3926 12.2423 21.5936 12 21.7726C11.7577 21.5936 11.4952 21.3926 11.2167 21.1708C10.1964 20.3584 9.17575 19.4398 8.22595 18.4373C5.5726 15.6365 4 12.7534 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10C20 12.7534 18.4274 15.6365 15.774 18.4373ZM12 14C9.79086 14 8 12.2091 8 10C8 7.79086 9.79086 6 12 6C14.2091 6 16 7.79086 16 10C16 12.2091 14.2091 14 12 14ZM14 10C14 11.1046 13.1046 12 12 12C10.8954 12 10 11.1046 10 10C10 8.89543 10.8954 8 12 8C13.1046 8 14 8.89543 14 10Z" fill="currentColor"></path>'+
'</mask>'+
'<g mask="url(#mask0-1684)">'+
'<rect width="20" height="20" fill="currentColor"></rect>'+
'</g>'+
'</svg>',
photooverlay: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/primPhotoIcon.67798fe4.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M5 2H19C20.6569 2 22 3.34315 22 5V14.9971C22 14.999 22 15.001 22 15.0029V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2ZM20 12.5858V5C20 4.44772 19.5523 4 19 4H5C4.44772 4 4 4.44772 4 5V19C4 19.4288 4.2699 19.7946 4.64909 19.9367L15.2929 9.29289C15.6834 8.90236 16.3166 8.90236 16.7071 9.29289L20 12.5858ZM7.41421 20L16 11.4142L20 15.4142V19C20 19.5523 19.5523 20 19 20H7.41421ZM6 8.5C6 9.88071 7.11928 11 8.5 11C9.88071 11 11 9.88071 11 8.5C11 7.11928 9.88071 6 8.5 6C7.11928 6 6 7.11928 6 8.5ZM8.5 9C8.77614 9 9 8.77614 9 8.5C9 8.22386 8.77614 8 8.5 8C8.22386 8 8 8.22386 8 8.5C8 8.77614 8.22386 9 8.5 9Z" fill="currentColor"></path>'+
'<mask id="mask0-3334" mask-type="alpha" maskUnits="userSpaceOnUse" x="2" y="2" width="20" height="20">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M5 2H19C20.6569 2 22 3.34315 22 5V14.9971C22 14.999 22 15.001 22 15.0029V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2ZM20 12.5858V5C20 4.44772 19.5523 4 19 4H5C4.44772 4 4 4.44772 4 5V19C4 19.4288 4.2699 19.7946 4.64909 19.9367L15.2929 9.29289C15.6834 8.90236 16.3166 8.90236 16.7071 9.29289L20 12.5858ZM7.41421 20L16 11.4142L20 15.4142V19C20 19.5523 19.5523 20 19 20H7.41421ZM6 8.5C6 9.88071 7.11928 11 8.5 11C9.88071 11 11 9.88071 11 8.5C11 7.11928 9.88071 6 8.5 6C7.11928 6 6 7.11928 6 8.5ZM8.5 9C8.77614 9 9 8.77614 9 8.5C9 8.22386 8.77614 8 8.5 8C8.22386 8 8 8.22386 8 8.5C8 8.77614 8.22386 9 8.5 9Z" fill="currentColor"></path>'+
'</mask>'+
'<g mask="url(#mask0-3334)">'+
'</g>'+
'</svg>',
ellipsoid: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/primSphereIcon.9a466b3d.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 18.0751 5.92487 23 12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" fill="currentColor"></path>'+
'<mask id="mask0-2477" mask-type="alpha" maskUnits="userSpaceOnUse" x="1" y="1" width="22" height="22">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 18.0751 5.92487 23 12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" fill="currentColor"></path>'+
'</mask>'+
'<g mask="url(#mask0-2477)">'+
'<rect width="24" height="24" fill="currentColor"></rect>'+
'</g>'+
'</svg>',
model: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/primModel.5669a232.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M11.1769 0.659996C11.4129 0.569212 11.6763 0.581925 11.9025 0.695022L17.9025 3.69502C18.0914 3.7895 18.2411 3.94742 18.3253 4.14115L23.3253 15.6412C23.5096 16.065 23.3429 16.5595 22.9397 16.7853L10.4397 23.7853C10.1341 23.9564 9.75698 23.9347 9.47303 23.7296L0.473034 17.2296C0.157384 17.0016 0.0241251 16.5965 0.142794 16.2257L4.14279 3.72571C4.22592 3.46595 4.42234 3.2579 4.67689 3.16L11.1769 0.659996ZM5.51532 5.34256L10.066 7.99714L9.20669 21.3169L2.05611 16.1526L5.51532 5.34256ZM11.0047 21.4059L21.3501 15.6124L17.0416 5.70282L11.8636 8.09264L11.0047 21.4059ZM11.0485 6.48638L15.4226 4.46756L11.4525 2.48252L7.07261 4.16711L11.0485 6.48638Z" fill="currentColor"></path>'+
'</svg>',
tileset:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/primTileset.b177e547.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M5.1598 3.15905C5.33863 3.05529 5.54206 3 5.75012 3C5.95819 3 6.16161 3.05529 6.34045 3.15905L10.9057 5.80778C11.0892 5.91425 11.2394 6.06737 11.3429 6.2495C11.4464 6.43151 11.5001 6.63696 11.5001 6.84503V12.75C11.5001 13.1642 11.1643 13.5 10.7501 13.5C10.3359 13.5 10.0001 13.1642 10.0001 12.75V7.01658L5.75012 4.55074L1.50012 7.01658V14.4834L5.75012 16.9492L7.87028 15.7191C8.22856 15.5113 8.68752 15.6332 8.89539 15.9915C9.10326 16.3497 8.98133 16.8087 8.62305 17.0166L6.34045 18.3409C6.16161 18.4447 5.95819 18.5 5.75012 18.5C5.54205 18.5 5.33863 18.4447 5.1598 18.3409L0.594582 15.6922C0.411075 15.5857 0.260861 15.4326 0.157338 15.2505C0.0538874 15.0685 0.000121832 14.863 0.00012207 14.6549V6.84503C0.00012213 6.63695 0.0538884 6.43151 0.157339 6.2495C0.260859 6.06738 0.411072 5.91425 0.594582 5.80778L5.1598 3.15905Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M5.75012 9C6.16434 9 6.50012 9.33579 6.50012 9.75L6.50012 17.75C6.50012 18.1642 6.16434 18.5 5.75012 18.5C5.33591 18.5 5.00012 18.1642 5.00012 17.75L5.00012 9.75C5.00012 9.33579 5.33591 9 5.75012 9Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M0.10504 6.3674C0.316339 6.01114 0.776442 5.89362 1.13271 6.10492L5.80389 8.87537L10.361 6.10949C10.7151 5.89457 11.1764 6.0074 11.3913 6.3615C11.6062 6.7156 11.4934 7.17687 11.1393 7.39179L6.19748 10.3911C5.9607 10.5349 5.66398 10.5364 5.42575 10.3951L0.367526 7.39507C0.0112599 7.18377 -0.106259 6.72367 0.10504 6.3674Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M17.7501 6C18.1643 6 18.5001 6.33579 18.5001 6.75L18.5001 13.75C18.5001 14.1642 18.1643 14.5 17.7501 14.5C17.3359 14.5 17.0001 14.1642 17.0001 13.75L17.0001 6.75C17.0001 6.33579 17.3359 6 17.7501 6Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M17.1598 0.159051C17.3386 0.0552942 17.5421 0 17.7501 0C17.9582 0 18.1616 0.0552933 18.3404 0.159051L22.9057 2.80778C23.0892 2.91425 23.2394 3.06737 23.3429 3.2495C23.4464 3.43151 23.5001 3.63696 23.5001 3.84503V13.6549C23.5001 13.863 23.4464 14.0685 23.3429 14.2505C23.2394 14.4326 23.0892 14.5857 22.9057 14.6922L19.2528 16.7974C18.8945 17.0053 18.4355 16.8834 18.2277 16.5251C18.0198 16.1668 18.1417 15.7079 18.5 15.5L22.0001 13.4834V4.01658L17.7501 1.55074L13.5001 4.01658V11.75C13.5001 12.1642 13.1643 12.5 12.7501 12.5C12.3359 12.5 12.0001 12.1642 12.0001 11.75V3.84503C12.0001 3.63695 12.0539 3.43151 12.1573 3.2495C12.2609 3.06738 12.4111 2.91425 12.5946 2.80778L17.1598 0.159051Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M12.105 3.3674C12.3163 3.01114 12.7764 2.89362 13.1327 3.10492L17.8039 5.87537L22.361 3.10949C22.7151 2.89457 23.1764 3.0074 23.3913 3.3615C23.6062 3.7156 23.4934 4.17687 23.1393 4.39179L18.1975 7.39114C17.9607 7.53486 17.664 7.53637 17.4257 7.39507L12.3675 4.39507C12.0113 4.18377 11.8937 3.72367 12.105 3.3674Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M13.7501 17C14.1643 17 14.5001 17.3358 14.5001 17.75V22.75C14.5001 23.1642 14.1643 23.5 13.7501 23.5C13.3359 23.5 13.0001 23.1642 13.0001 22.75V17.75C13.0001 17.3358 13.3359 17 13.7501 17Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M13.1715 11.15C13.3488 11.0514 13.548 11 13.7501 11C13.9522 11 14.1515 11.0514 14.3287 11.15L18.8939 13.6899C19.076 13.7912 19.229 13.9392 19.336 14.1198C19.4432 14.3005 19.5001 14.507 19.5001 14.7179V19.7821C19.5001 19.993 19.4432 20.1995 19.336 20.3802C19.229 20.5608 19.076 20.7088 18.8939 20.8101L14.3287 23.35C14.1515 23.4486 13.9522 23.5 13.7501 23.5C13.548 23.5 13.3488 23.4486 13.1715 23.35L8.60633 20.8101C8.42425 20.7088 8.27127 20.5608 8.1642 20.3802C8.05707 20.1995 8.00012 19.993 8.00012 19.7821V14.7179C8.00012 14.507 8.05707 14.3005 8.1642 14.1198C8.27127 13.9392 8.42425 13.7912 8.60633 13.6899L13.1715 11.15ZM13.7501 12.5446L9.50012 14.9092V19.5908L13.7501 21.9554L18.0001 19.5908V14.9092L13.7501 12.5446Z" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M8.10504 14.3674C8.31634 14.0111 8.77644 13.8936 9.13271 14.1049L13.8039 16.8754L18.361 14.1095C18.7151 13.8946 19.1764 14.0074 19.3913 14.3615C19.6062 14.7156 19.4934 15.1769 19.1393 15.3918L14.1975 18.3911C13.9607 18.5349 13.664 18.5364 13.4257 18.3951L8.36753 15.3951C8.01126 15.1838 7.89374 14.7237 8.10504 14.3674Z" fill="currentColor"></path>'+
'</svg>',
resource:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/primResourceIcon.a1c015e7.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M13.7072 1.29303C13.5263 1.11198 13.2762 1 13 1H6C4.34315 1 3 2.34315 3 4V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V9C21 8.44772 20.5523 8 20 8H17.5858L14 4.41421V2C14 1.72393 13.8881 1.47398 13.7072 1.29303ZM12 3H6C5.44772 3 5 3.44772 5 4V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V10" fill="currentColor"></path>'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M13.7071 1.29289C13.5196 1.10536 13.2652 1 13 1H6C4.34315 1 3 2.34315 3 4V20C3 21.6569 4.34315 23 6 23H18C19.6569 23 21 21.6569 21 20V9C21 8.73478 20.8946 8.48043 20.7071 8.29289L13.7071 1.29289ZM6 3H12.5858L19 9.41421V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V4C5 3.44772 5.44772 3 6 3Z" fill="currentColor"></path>'+
'<path d="M14 2C14 1.44772 13.5523 1 13 1C12.4477 1 12 1.44772 12 2V9C12 9.55229 12.4477 10 13 10H20C20.5523 10 21 9.55229 21 9C21 8.44772 20.5523 8 20 8H14V2Z" fill="currentColor"></path>'+
'</svg>',
folder:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/folderIcon.4cac3bc6.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M20 5H11.5352L9.83205 2.4453C9.64658 2.1671 9.33435 2 9 2H4C2.34315 2 1 3.34315 1 5V19C1 20.6569 2.34315 22 4 22H20C21.6569 22 23 20.6569 23 19V8C23 6.34315 21.6569 5 20 5ZM4 4H8.46482L10.1679 6.5547C10.3534 6.8329 10.6656 7 11 7H20C20.5523 7 21 7.44772 21 8V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V5C3 4.44772 3.44772 4 4 4Z" fill="currentColor"></path>'+
'</svg>',
visible: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/viewIcon.688711cd.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M0.894336 10.2075C0.509967 10.8026 0.246141 11.2717 0.105573 11.5528C-0.0351909 11.8343 -0.0351909 12.1657 0.105573 12.4472C0.246141 12.7283 0.509967 13.1974 0.894336 13.7925C1.5305 14.7776 2.28113 15.762 3.14546 16.6839C5.66131 19.3675 8.6202 21 12 21C15.3798 21 18.3387 19.3675 20.8545 16.6839C21.7189 15.762 22.4695 14.7776 23.1057 13.7925C23.49 13.1974 23.7539 12.7283 23.8944 12.4472C24.0352 12.1657 24.0352 11.8343 23.8944 11.5528C23.7539 11.2717 23.49 10.8026 23.1057 10.2075C22.4695 9.22245 21.7189 8.23802 20.8545 7.31606C18.3387 4.63249 15.3798 3 12 3C8.6202 3 5.66131 4.63249 3.14546 7.31606C2.28113 8.23802 1.5305 9.22245 0.894336 10.2075ZM4.60459 15.3161C3.8283 14.488 3.14924 13.5974 2.57447 12.7075C2.41133 12.4549 2.26664 12.2176 2.14077 12C2.26664 11.7824 2.41133 11.5451 2.57447 11.2925C3.14924 10.4026 3.8283 9.51198 4.60459 8.68394C6.77625 6.36751 9.25486 5 12.0001 5C14.7453 5 17.2239 6.36751 19.3955 8.68394C20.1718 9.51198 20.8509 10.4026 21.4256 11.2925C21.5888 11.5451 21.7335 11.7824 21.8593 12C21.7335 12.2176 21.5888 12.4549 21.4256 12.7075C20.8509 13.5974 20.1718 14.488 19.3955 15.3161C17.2239 17.6325 14.7453 19 12.0001 19C9.25486 19 6.77625 17.6325 4.60459 15.3161ZM12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z" fill="currentColor"></path>'+
'<mask id="mask0-54" mask-type="alpha" maskUnits="userSpaceOnUse" x="8" y="8" width="8" height="8">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z" fill="currentColor"></path>'+
'</mask>'+
'</svg>',
invisible:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="injected-svg" data-src="/assets/viewNotIcon.9f3d3616.svg" xmlns:xlink="http://www.w3.org/1999/xlink">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M4.56848 5.98269L0.292893 1.70711C-0.097631 1.31658 -0.097631 0.683418 0.292893 0.292893C0.683418 -0.0976311 1.31658 -0.0976311 1.70711 0.292893L6.75542 5.34121C6.76271 5.34828 6.76991 5.35547 6.77701 5.3628L10.5832 9.16897C10.5855 9.17127 10.5878 9.17359 10.5901 9.17592L14.8242 13.41C14.8265 13.4122 14.8287 13.4144 14.8309 13.4167L18.6354 17.2212C18.6427 17.2283 18.6499 17.2355 18.657 17.2428L23.7071 22.2929C24.0976 22.6834 24.0976 23.3166 23.7071 23.7071C23.3166 24.0976 22.6834 24.0976 22.2929 23.7071L17.8261 19.2403C16.096 20.3536 14.0828 20.9661 12 21C8.6202 21 5.66131 19.3675 3.14546 16.6839C2.28113 15.762 1.5305 14.7776 0.894336 13.7925C0.509967 13.1974 0.246141 12.7283 0.105573 12.4472C-0.0397387 12.1566 -0.0347894 11.8135 0.118844 11.5272C1.25035 9.4185 2.7597 7.53966 4.56848 5.98269ZM5.9871 7.40131C4.4503 8.70138 3.14933 10.2582 2.14256 12.0032C2.268 12.2199 2.41207 12.4561 2.57441 12.7075C3.14919 13.5974 3.82825 14.488 4.60454 15.3161C6.77619 17.6325 9.2548 19 11.9837 19.0001C13.532 18.9748 15.0414 18.5538 16.3714 17.7856L14.0498 15.464C13.1345 16.0378 12.0106 16.225 10.9354 15.9504C9.51816 15.5885 8.41149 14.4818 8.04955 13.0646C7.77496 11.9894 7.96225 10.8655 8.53596 9.95018L5.9871 7.40131ZM10.0279 11.4421C9.90853 11.8001 9.89062 12.1909 9.98736 12.5697C10.1683 13.2783 10.7217 13.8317 11.4303 14.0126C11.8091 14.1094 12.1999 14.0915 12.5579 13.9721L10.0279 11.4421ZM20.1962 15.9552C19.7736 15.5996 19.7193 14.9687 20.0748 14.5462C20.7439 13.751 21.3406 12.8981 21.858 11.9977C21.7324 11.7807 21.5882 11.5443 21.4256 11.2925C20.8508 10.4026 20.1718 9.51198 19.3955 8.68394C17.2238 6.36751 14.7452 5 11.9977 5C11.3682 4.99852 10.7408 5.07023 10.1279 5.21368C9.59016 5.33955 9.05219 5.00566 8.92632 4.46791C8.80045 3.93016 9.13434 3.39219 9.67209 3.26632C10.4359 3.08753 11.2179 2.99816 12 3C15.3798 3 18.3387 4.63249 20.8545 7.31606C21.7189 8.23802 22.4695 9.22245 23.1057 10.2075C23.49 10.8026 23.7539 11.2717 23.8944 11.5528C24.0395 11.8429 24.0348 12.1854 23.8819 12.4714C23.2421 13.6684 22.479 14.7953 21.6052 15.8338C21.2496 16.2564 20.6187 16.3107 20.1962 15.9552Z" fill="currentColor"></path>'+
'<mask id="mask0-169" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">'+
'<path fill-rule="evenodd" clip-rule="evenodd" d="M4.56848 5.98269L0.292893 1.70711C-0.097631 1.31658 -0.097631 0.683418 0.292893 0.292893C0.683418 -0.0976311 1.31658 -0.0976311 1.70711 0.292893L6.75542 5.34121C6.76271 5.34828 6.76991 5.35547 6.77701 5.3628L10.5832 9.16897C10.5855 9.17127 10.5878 9.17359 10.5901 9.17592L14.8242 13.41C14.8265 13.4122 14.8287 13.4145 14.8309 13.4167L18.6354 17.2212C18.6427 17.2283 18.6499 17.2355 18.657 17.2428L23.7071 22.2929C24.0976 22.6834 24.0976 23.3166 23.7071 23.7071C23.3166 24.0976 22.6834 24.0976 22.2929 23.7071L17.8261 19.2403C16.096 20.3536 14.0828 20.9661 12 21C8.6202 21 5.66131 19.3675 3.14546 16.6839C2.28113 15.762 1.5305 14.7776 0.894336 13.7925C0.509967 13.1974 0.246141 12.7283 0.105573 12.4472C-0.0397387 12.1566 -0.0347894 11.8135 0.118844 11.5272C1.25035 9.4185 2.7597 7.53966 4.56848 5.98269ZM5.9871 7.40131C4.4503 8.70138 3.14933 10.2582 2.14256 12.0032C2.268 12.2199 2.41207 12.4561 2.57441 12.7075C3.14919 13.5974 3.82825 14.488 4.60454 15.3161C6.77619 17.6325 9.2548 19 11.9837 19.0001C13.532 18.9748 15.0414 18.5538 16.3714 17.7856L14.0498 15.464C13.1345 16.0377 12.0106 16.225 10.9354 15.9504C9.51816 15.5885 8.41149 14.4818 8.04955 13.0646C7.77496 11.9894 7.96225 10.8655 8.53596 9.95018L5.9871 7.40131ZM10.0279 11.4421C9.90853 11.8001 9.89062 12.1909 9.98736 12.5697C10.1683 13.2783 10.7217 13.8317 11.4303 14.0126C11.8091 14.1094 12.1999 14.0915 12.5579 13.9721L10.0279 11.4421ZM20.1962 15.9552C19.7736 15.5996 19.7193 14.9687 20.0748 14.5462C20.7439 13.751 21.3406 12.8981 21.858 11.9977C21.7324 11.7807 21.5882 11.5443 21.4256 11.2925C20.8508 10.4026 20.1718 9.51198 19.3955 8.68394C17.2238 6.36751 14.7452 5 11.9977 5C11.3682 4.99852 10.7408 5.07023 10.1279 5.21368C9.59016 5.33955 9.05219 5.00566 8.92632 4.46791C8.80045 3.93016 9.13434 3.39219 9.67209 3.26632C10.4359 3.08753 11.2179 2.99816 12 3C15.3798 3 18.3387 4.63249 20.8545 7.31606C21.7189 8.23802 22.4695 9.22244 23.1057 10.2075C23.49 10.8026 23.7539 11.2717 23.8944 11.5528C24.0395 11.8429 24.0348 12.1854 23.8819 12.4714C23.2421 13.6684 22.479 14.7953 21.6052 15.8338C21.2496 16.2564 20.6187 16.3107 20.1962 15.9552Z" fill="currentColor"></path>'+
'</mask>'+
'<g mask="url(#mask0-169)">'+
'</g>'+
'</svg>',
}
