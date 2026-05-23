let currentCategory = 'ped';
let appearanceData = {};
let appearanceSettings = {};
let locales = {};
let config = {};
let focusedItemIndex = 0;

const categoryTitles = {
    ped: "MODELO",
    headBlend: "HERANÇA",
    faceFeatures: "ROSTO",
    headOverlays: "APARÊNCIA",
    components: "ROUPAS",
    props: "ACESSÓRIOS",
    tattoos: "TATUAGENS"
};

function getFaceFeatureLabel(key) {
    if (!locales.faceFeatures) return key;
    
    const face = locales.faceFeatures;
    const groups = {
        nose: face.nose ? face.nose.title : "Nariz",
        eyebrows: face.eyebrows ? face.eyebrows.title : "Sobrancelhas",
        cheeks: face.cheeks ? face.cheeks.title : "Bochecha",
        eyesAndMouth: face.eyesAndMouth ? face.eyesAndMouth.title : "Olhos e Boca",
        jaw: face.jaw ? face.jaw.title : "Mandíbula",
        chin: face.chin ? face.chin.title : "Queixo",
        neck: face.neck ? face.neck.title : "Pescoço"
    };

    const mapping = {
        noseWidth: face.nose ? `${groups.nose} - ${face.nose.width}` : null,
        nosePeakHigh: face.nose ? `${groups.nose} - ${face.nose.peakHeight}` : null,
        nosePeakSize: face.nose ? `${groups.nose} - ${face.nose.size}` : null,
        noseBoneHigh: face.nose ? `${groups.nose} - ${face.nose.boneHeight}` : null,
        nosePeakLowering: face.nose ? `${groups.nose} - ${face.nose.height}` : null,
        noseBoneTwist: face.nose ? `${groups.nose} - ${face.nose.boneTwist}` : null,
        
        eyeBrownHigh: face.eyebrows ? `${groups.eyebrows} - ${face.eyebrows.height}` : null,
        eyeBrownForward: face.eyebrows ? `${groups.eyebrows} - ${face.eyebrows.depth}` : null,
        
        cheeksBoneHigh: face.cheeks ? `${groups.cheeks} - ${face.cheeks.boneHeight}` : null,
        cheeksBoneWidth: face.cheeks ? `${groups.cheeks} - ${face.cheeks.boneWidth}` : null,
        cheeksWidth: face.cheeks ? `${groups.cheeks} - ${face.cheeks.width}` : null,
        
        eyesOpening: face.eyesAndMouth ? `${groups.eyesAndMouth} - ${face.eyesAndMouth.eyesOpening}` : null,
        lipsThickness: face.eyesAndMouth ? `${groups.eyesAndMouth} - ${face.eyesAndMouth.lipsThickness}` : null,
        
        jawBoneWidth: face.jaw ? `${groups.jaw} - ${face.jaw.width}` : null,
        jawBoneBackSize: face.jaw ? `${groups.jaw} - ${face.jaw.size}` : null,
        
        chinBoneLowering: face.chin ? `${groups.chin} - ${face.chin.lowering}` : null,
        chinBoneLenght: face.chin ? `${groups.chin} - ${face.chin.length}` : null,
        chinBoneSize: face.chin ? `${groups.chin} - ${face.chin.size}` : null,
        chinHole: face.chin ? `${groups.chin} - ${face.chin.hole}` : null,
        
        neckThickness: face.neck ? `${groups.neck} - ${face.neck.thickness}` : null
    };
    
    return mapping[key] || key;
}

const app = document.getElementById('app');
const itemsContainer = document.getElementById('items-grid');
const categoryTitle = document.querySelector('#category-title');

// Communication with Lua
window.addEventListener('message', (event) => {
    const data = event.data;
    if (data.type === "appearance_display") {
        app.style.display = 'flex';
        initializeUI();
    } else if (data.type === "appearance_hide") {
        app.style.display = 'none';
    }
});

async function post(path, data = {}) {
    try {
        const resp = await fetch(`https://${GetParentResourceName()}/${path}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await resp.json();
    } catch (e) {
        return null;
    }
}

async function initializeUI() {
    locales = await post('appearance_get_locales') || {};
    const settings = await post('appearance_get_settings') || {};
    appearanceSettings = settings.appearanceSettings || {};
    const data = await post('appearance_get_data') || {};
    appearanceData = data.appearanceData || {};
    if (!appearanceData.tattoos || Array.isArray(appearanceData.tattoos)) {
        const flatTattoos = Array.isArray(appearanceData.tattoos) ? appearanceData.tattoos : [];
        appearanceData.tattoos = {};
        if (flatTattoos.length > 0 && appearanceSettings.tattoos && appearanceSettings.tattoos.items) {
            flatTattoos.forEach(tattoo => {
                for (const cat in appearanceSettings.tattoos.items) {
                    if (appearanceSettings.tattoos.items[cat].some(t => t.collection === tattoo.collection && (t.hashMale === tattoo.overlay || t.hashFemale === tattoo.overlay || t.name === tattoo.name))) {
                        if (!appearanceData.tattoos[cat]) appearanceData.tattoos[cat] = [];
                        appearanceData.tattoos[cat].push(tattoo);
                        break;
                    }
                }
            });
        }
    }
    config = data.config || {};
    
    filterCategories();
    renderCategory(currentCategory);
}

function filterCategories() {
    const categories = {
        ped: config.ped,
        headBlend: config.headBlend,
        faceFeatures: config.faceFeatures,
        headOverlays: config.headOverlays,
        components: config.components,
        props: config.props,
        tattoos: config.tattoos
    };

    let firstAvailable = null;

    document.querySelectorAll('.category-btn').forEach(btn => {
        const cat = btn.dataset.category;
        if (categories[cat] === false) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex';
            if (!firstAvailable) firstAvailable = cat;
        }
    });

    if (categories[currentCategory] === false && firstAvailable) {
        currentCategory = firstAvailable;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === currentCategory);
        });
    }
}

function renderCategory(category) {
    currentCategory = category;
    categoryTitle.innerText = categoryTitles[category] || category.toUpperCase();
    itemsContainer.innerHTML = '';
    focusedItemIndex = 0;

    if (category === 'headBlend') {
        renderHeritage();
        return;
    }

    if (category === 'tattoos') {
        renderTattoosGrid();
        return;
    }

    let items = [];

    if (category === 'ped') {
        renderPed();
        return;
    }

    if (category === 'components') {
        if (appearanceSettings.components) {
            appearanceSettings.components.forEach((comp, index) => {
                const compNames = getComponentName(comp.component_id);
                if (config.componentConfig && config.componentConfig[compNames.config] === false) return;

                items.push({
                    label: `COMPONENTE ${comp.component_id}`,
                    name: locales.components ? locales.components[compNames.locale] || `Peça ${comp.component_id}` : `Peça ${comp.component_id}`,
                    type: 'component',
                    componentId: comp.component_id,
                    value: getComponentValue(comp.component_id),
                    textureValue: getComponentTexture(comp.component_id),
                    min: comp.drawable.min,
                    max: comp.drawable.max,
                    textureMin: comp.texture.min,
                    textureMax: comp.texture.max,
                    blacklist: comp.blacklist
                });
            });
        }
    } else if (category === 'props') {

        if (appearanceSettings.props) {
            appearanceSettings.props.forEach((prop, index) => {
                const propName = getPropName(prop.prop_id);
                if (config.propConfig && config.propConfig[propName] === false) return;

                items.push({
                    label: `ACESSÓRIO ${prop.prop_id}`,
                    name: locales.props ? locales.props[propName] || `Acessório ${prop.prop_id}` : `Acessório ${prop.prop_id}`,
                    type: 'prop',
                    propId: prop.prop_id,
                    value: getPropValue(prop.prop_id),
                    textureValue: getPropTexture(prop.prop_id),
                    min: prop.drawable.min,
                    max: prop.drawable.max,
                    textureMin: prop.texture.min,
                    textureMax: prop.texture.max,
                    blacklist: prop.blacklist
                });
            });
        }
    } else if (category === 'headOverlays') {
        // Handle hair and other overlays
        items.push({
            label: "CABELO",
            name: "Estilo de Cabelo",
            type: 'hair',
            value: appearanceData.hair.style,
            min: appearanceSettings.hair.style.min,
            max: appearanceSettings.hair.style.max,
            colors: appearanceSettings.hair.color.items,
            colorValue: appearanceData.hair.color,
            highlightColors: appearanceSettings.hair.highlight.items,
            highlightValue: appearanceData.hair.highlight
        });
        
        if (appearanceSettings.eyeColor) {
            items.push({
                label: "OLHOS",
                name: locales.headOverlays ? locales.headOverlays.eyeColor || "Cor dos Olhos" : "Cor dos Olhos",
                type: 'eyeColor',
                value: appearanceData.eyeColor || 0,
                min: appearanceSettings.eyeColor.min || 0,
                max: appearanceSettings.eyeColor.max || 30
            });
        }
        
        Object.keys(appearanceSettings.headOverlays).forEach(key => {
            const overlaySettings = appearanceSettings.headOverlays[key];
            items.push({
                label: key.toUpperCase(),
                name: locales.headOverlays ? locales.headOverlays[key] || key : key,
                type: 'headOverlay',
                overlayId: key,
                value: appearanceData.headOverlays[key].style,
                min: overlaySettings.style.min,
                max: overlaySettings.style.max,
                opacity: appearanceData.headOverlays[key].opacity,
                colors: overlaySettings.color ? overlaySettings.color.items : null,
                colorValue: appearanceData.headOverlays[key].color,
                secondaryColorValue: appearanceData.headOverlays[key].secondColor
            });
        });
    } else if (category === 'faceFeatures') {
        Object.keys(appearanceSettings.faceFeatures).forEach(key => {
            items.push({
                label: "CARACTERÍSTICA",
                name: getFaceFeatureLabel(key),
                type: 'faceFeature',
                featureId: key,
                value: appearanceData.faceFeatures[key],
                min: -1,
                max: 1,
                step: 0.1
            });
        });
    } else if (category === 'headBlend') {
        const headBlendLabels = {
            shapeFirst: "Face (Pai)",
            shapeSecond: "Face (Mãe)",
            shapeThird: "Face (Extra)",
            skinFirst: "Pele (Pai)",
            skinSecond: "Pele (Mãe)",
            skinThird: "Pele (Extra)",
            shapeMix: "Mistura (Face)",
            skinMix: "Mistura (Pele)",
            thirdMix: "Mistura (Extra)"
        };
        ['shapeFirst', 'shapeSecond', 'shapeThird', 'skinFirst', 'skinSecond', 'skinThird'].forEach(key => {
            items.push({
                label: "HERANÇA",
                name: headBlendLabels[key] || key,
                type: 'headBlend',
                blendId: key,
                value: appearanceData.headBlend[key],
                min: 0,
                max: 45
            });
        });
        ['shapeMix', 'skinMix', 'thirdMix'].forEach(key => {
            items.push({
                label: "MISTURA",
                name: headBlendLabels[key] || key,
                type: 'headBlend',
                blendId: key,
                value: appearanceData.headBlend[key],
                min: 0,
                max: 1,
                step: 0.1
            });
        });
    } else if (category === 'tattoos') {
        if (appearanceSettings.tattoos) {
            Object.keys(appearanceSettings.tattoos.items).forEach(cat => {
                const catName = locales.tattoos && locales.tattoos.items && locales.tattoos.items[cat] ? locales.tattoos.items[cat] : cat;
                items.push({
                    label: "TATUAGEM",
                    name: catName.toUpperCase(),
                    type: 'tattoo',
                    tattooCategory: cat,
                    value: 0,
                    min: 0,
                    max: appearanceSettings.tattoos.items[cat].length,
                    step: 1
                });
            });

        }
    }

    items.forEach((item, index) => {
        const card = createItemCard(item, index);
        itemsContainer.appendChild(card);
    });

    updateFocus();
}

function createItemCard(item, index) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.index = index;
    card.dataset.type = item.type;
    if (item.componentId !== undefined) card.dataset.componentId = item.componentId;
    if (item.propId !== undefined) card.dataset.propId = item.propId;
    if (item.tattooCategory !== undefined) card.dataset.tattooCategory = item.tattooCategory;
    if (item.overlayId !== undefined) card.dataset.overlayId = item.overlayId;
    if (item.featureId !== undefined) card.dataset.featureId = item.featureId;
    if (item.blendId !== undefined) card.dataset.blendId = item.blendId;

    const isPed = item.type === 'ped_model';
    const isComponentOrProp = item.type === 'component' || item.type === 'prop';
    const hasTexture = isComponentOrProp || (item.textureMax !== undefined && item.textureMax > 0);
    const valueDisplay = isPed ? (item.options[item.value] || item.value) : item.value;

    card.innerHTML = `
        <div class="item-header">
            <div class="item-info">
                <span class="item-label">${item.label}</span>
                <span class="item-name">${item.name}</span>
            </div>
            ${isPed ? `<div class="item-value-badge">${valueDisplay}</div>` : 
            `<input type="number" class="item-value-badge drawable-badge" value="${item.value}" min="${item.min}" max="${item.max}" onchange="updateItemValue(${index}, this.value, false)">`}
        </div>
        <div class="controls-wrapper">
            <div class="control-container">
                ${hasTexture ? '<span class="control-label">MODELO</span>' : ''}
                <div class="control-group">
                    <button class="arrow-btn dec" onclick="changeValue(${index}, -1, false)"><i class="fas fa-chevron-left"></i></button>
                    <input type="range" class="range-input drawable-range" min="${item.min}" max="${item.max}" step="${item.step || 1}" value="${item.value}" oninput="updateItemValue(${index}, this.value, false)">
                    <button class="arrow-btn inc" onclick="changeValue(${index}, 1, false)"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            ${hasTexture ? `
            <div class="control-container texture-controls">
                <div class="control-header">
                    <span class="control-label">TEXTURA</span>
                    <input type="number" class="item-value-badge texture-badge" value="${item.textureValue || 0}" min="${item.textureMin || 0}" max="${item.textureMax || 0}" onchange="updateItemValue(${index}, this.value, true)">
                </div>
                <div class="control-group">
                    <button class="arrow-btn dec" onclick="changeValue(${index}, -1, true)"><i class="fas fa-chevron-left"></i></button>
                    <input type="range" class="range-input texture-range" min="${item.textureMin || 0}" max="${item.textureMax || 0}" step="1" value="${item.textureValue || 0}" oninput="updateItemValue(${index}, this.value, true)">
                    <button class="arrow-btn inc" onclick="changeValue(${index}, 1, true)"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            ` : ''}
            ${item.opacity !== undefined ? `
            <div class="control-container opacity-controls">
                <div class="control-header">
                    <span class="control-label">OPACIDADE</span>
                    <span class="item-value-badge opacity-value">${Math.round(item.opacity * 100)}%</span>
                </div>
                <div class="control-group">
                    <button class="arrow-btn dec" onclick="changeOpacity(${index}, -0.1)"><i class="fas fa-chevron-left"></i></button>
                    <input type="range" class="range-input opacity-range" min="0" max="1" step="0.1" value="${item.opacity}" oninput="updateItemOpacity(${index}, this.value)">
                    <button class="arrow-btn inc" onclick="changeOpacity(${index}, 0.1)"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            ` : ''}
            ${item.type === 'tattoo' ? `
            <div class="tattoo-actions">
                <button class="toggle-tattoo-btn" onclick="toggleTattoo(${index})">
                    <i class="fas fa-plus"></i> ADICIONAR / REMOVER
                </button>
                <div class="applied-count">Aplicadas: <span class="count-val">${(appearanceData.tattoos && appearanceData.tattoos[item.tattooCategory]) ? appearanceData.tattoos[item.tattooCategory].length : 0}</span></div>
            </div>
            ` : ''}
            ${(item.colors) ? `
            <div class="color-selector-wrapper">
                <div class="color-selection-group">
                    <span class="control-label">${item.type === 'hair' ? 'COR PRIMÁRIA' : 'COR'}</span>
                    <div class="color-grid">
                        ${item.colors.map((rgb, i) => `
                            <div class="color-option ${item.colorValue === i ? 'active' : ''}" 
                                 style="background-color: rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" 
                                 onclick="updateItemColor(${index}, ${i}, false)"></div>
                        `).join('')}
                    </div>
                </div>
                ${(item.highlightColors || (item.type === 'headOverlay' && item.colors)) ? `
                <div class="color-selection-group secondary-color-group">
                    <span class="control-label">${item.type === 'hair' ? 'LUZES / DEGRADÊ' : 'COR SECUNDÁRIA'}</span>
                    <div class="color-grid">
                        ${(item.highlightColors || item.colors).map((rgb, i) => `
                            <div class="color-option ${ (item.highlightValue === i || item.secondaryColorValue === i) ? 'active' : ''}" 
                                 style="background-color: rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" 
                                 onclick="updateItemColor(${index}, ${i}, true)"></div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;

    if (item.featureId) card.dataset.featureId = item.featureId;
    if (item.blendId) card.dataset.blendId = item.blendId;

    card.addEventListener('click', () => {
        focusedItemIndex = index;
        updateFocus();
    });

    return card;
}

function updateFocus() {
    document.querySelectorAll('.item-card').forEach((card, idx) => {
        if (idx === focusedItemIndex) {
            card.classList.add('focused');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            card.classList.remove('focused');
        }
    });
}

function changeValue(index, delta, isTexture) {
    const card = document.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;
    const input = isTexture ? card.querySelector('.texture-range') : card.querySelector('.drawable-range');
    if (!input) return;

    let newValue = parseFloat(input.value) + (delta * (parseFloat(input.step) || 1));
    
    // Blacklist skipping logic (only for drawables)
    if (!isTexture) {
        const itemType = card.dataset.type;
        let item;
        if (itemType === 'component') {
            const componentId = parseInt(card.dataset.componentId);
            item = appearanceSettings.components.find(c => c.component_id === componentId);
        } else if (itemType === 'prop') {
            const propId = parseInt(card.dataset.propId);
            item = appearanceSettings.props.find(p => p.prop_id === propId);
        }

        if (item && item.blacklist && item.blacklist.drawables) {
            let attempts = 0;
            const maxAttempts = 50;
            while (item.blacklist.drawables.includes(Math.round(newValue)) && attempts < maxAttempts) {
                newValue += delta;
                attempts++;
                if (newValue < parseFloat(input.min) || newValue > parseFloat(input.max)) {
                    newValue -= delta; 
                    break;
                }
            }
        }
    }
    
    if (newValue >= parseFloat(input.min) && newValue <= parseFloat(input.max)) {
        input.value = newValue;
        updateItemValue(index, newValue, isTexture);
    }
}

function updateItemOpacity(index, value) {
    const card = document.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;
    const itemType = card.dataset.type;
    
    value = parseFloat(value);
    const opacityLabel = card.querySelector('.opacity-value');
    if (opacityLabel) opacityLabel.innerText = `${Math.round(value * 100)}%`;

    if (itemType === 'headOverlay') {
        const overlayKey = card.dataset.overlayId;
        if (overlayKey) {
            appearanceData.headOverlays[overlayKey].opacity = value;
            post('appearance_change_head_overlay', appearanceData.headOverlays);
        }
    }
}

function changeOpacity(index, delta) {
    const card = document.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;
    const input = card.querySelector('.opacity-range');
    if (!input) return;

    let newValue = parseFloat(input.value) + delta;
    // Fix floating point precision issues (e.g. 0.30000000000000004)
    newValue = Math.round(newValue * 10) / 10;
    
    if (newValue >= parseFloat(input.min) && newValue <= parseFloat(input.max)) {
        input.value = newValue;
        updateItemOpacity(index, newValue);
    }
}

async function toggleTattoo(index) {
    const card = document.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;
    const cat = card.dataset.tattooCategory;
    const value = parseFloat(card.querySelector('.drawable-range').value);
    const tattooIndex = Math.round(value);
    
    if (tattooIndex === 0) return;

    if (!appearanceData.tattoos) appearanceData.tattoos = {};
    if (!appearanceData.tattoos[cat]) appearanceData.tattoos[cat] = [];

    const tattooList = appearanceSettings.tattoos.items[cat];
    if (!tattooList || !tattooList[tattooIndex - 1]) return;

    const tattoo = JSON.parse(JSON.stringify(tattooList[tattooIndex - 1]));

    const existingIdx = appearanceData.tattoos[cat].findIndex(t => t.name === tattoo.name);
    if (existingIdx > -1) {
        appearanceData.tattoos[cat].splice(existingIdx, 1);
        await post('appearance_delete_tattoo', appearanceData.tattoos);
    } else {
        appearanceData.tattoos[cat].push(tattoo);
        await post('appearance_apply_tattoo', {
            updatedTattoos: appearanceData.tattoos,
            tattoo: tattoo
        });
    }

    const countLabel = card.querySelector('.count-val');
    if (countLabel) countLabel.innerText = appearanceData.tattoos[cat].length;
}

function removeAllTattoos() {
    appearanceData.tattoos = {};
    document.querySelectorAll('.count-val').forEach(span => span.innerText = '0');
    post('appearance_change_tattoos', {});
    if (currentCategory === 'tattoos') {
        renderTattoosGrid();
    }
}

function updateItemValue(index, value, isTexture) {
    const card = document.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;
    const itemType = card.dataset.type;
    
    value = parseFloat(value);
    if (isNaN(value)) return;

    // Manual input blacklist check (only for drawables)
    if (!isTexture) {
        let item;
        if (itemType === 'component') {
            const componentId = parseInt(card.dataset.componentId);
            item = appearanceSettings.components.find(c => c.component_id === componentId);
        } else if (itemType === 'prop') {
            const propId = parseInt(card.dataset.propId);
            item = appearanceSettings.props.find(p => p.prop_id === propId);
        }

        if (item && item.blacklist && item.blacklist.drawables && item.blacklist.drawables.includes(Math.round(value))) {
            return;
        }
    }

    const badge = isTexture ? card.querySelector('.texture-badge') : card.querySelector('.drawable-badge');
    const range = isTexture ? card.querySelector('.texture-range') : card.querySelector('.drawable-range');
    
    if (badge && badge.tagName === 'INPUT') badge.value = value;
    if (range) range.value = value;

    if (itemType === 'component') {
        const componentId = parseInt(card.dataset.componentId);
        const comp = appearanceData.components.find(c => c.component_id === componentId);
        if (!comp) return;
        
        if (isTexture) {
            comp.texture = value;
            post('appearance_change_component', {
                component_id: componentId,
                drawable: comp.drawable,
                texture: comp.texture
            });
        } else {
            comp.drawable = value;
            comp.texture = 0;
            const texBadge = card.querySelector('.texture-badge');
            const texRange = card.querySelector('.texture-range');
            if (texBadge) texBadge.value = 0;
            if (texRange) texRange.value = 0;

            post('appearance_change_component', {
                component_id: componentId,
                drawable: comp.drawable,
                texture: comp.texture
            }).then(compSettings => {
                if (compSettings && compSettings.texture) {
                    const texControls = card.querySelector('.texture-controls');
                    if (texControls) {
                        const tBadge = texControls.querySelector('.texture-badge');
                        const tRange = texControls.querySelector('.texture-range');
                        tBadge.max = compSettings.texture.max;
                        tRange.max = compSettings.texture.max;
                    }
                }
            });
        }
    } else if (itemType === 'prop') {
        const propId = parseInt(card.dataset.propId);
        const prop = appearanceData.props.find(p => p.prop_id === propId);
        if (!prop) return;

        if (isTexture) {
            prop.texture = value;
            post('appearance_change_prop', {
                prop_id: propId,
                drawable: prop.drawable,
                texture: prop.texture
            });
        } else {
            prop.drawable = value;
            prop.texture = 0;
            const texBadge = card.querySelector('.texture-badge');
            const texRange = card.querySelector('.texture-range');
            if (texBadge) texBadge.value = 0;
            if (texRange) texRange.value = 0;

            post('appearance_change_prop', {
                prop_id: propId,
                drawable: prop.drawable,
                texture: prop.texture
            }).then(propSettings => {
                if (propSettings && propSettings.texture) {
                    const texControls = card.querySelector('.texture-controls');
                    if (texControls) {
                        const tBadge = texControls.querySelector('.texture-badge');
                        const tRange = texControls.querySelector('.texture-range');
                        tBadge.max = propSettings.texture.max;
                        tRange.max = propSettings.texture.max;
                    }
                }
            });
        }
    } else if (itemType === 'hair') {
        appearanceData.hair.style = value;
        post('appearance_change_hair', {
            style: value,
            color: appearanceData.hair.color,
            highlight: appearanceData.hair.highlight
        });
    } else if (itemType === 'eyeColor') {
        const roundedValue = Math.round(value);
        appearanceData.eyeColor = roundedValue;
        post('appearance_change_eye_color', roundedValue);
    } else if (itemType === 'ped_model') {
        const model = appearanceSettings.ped.model.items[value];
        const pedBadge = card.querySelector('.item-value-badge');
        if (pedBadge) pedBadge.innerText = model;
        post('appearance_change_model', model).then(newData => {
            if (newData) {
                appearanceData = newData.appearanceData;
                appearanceSettings = newData.appearanceSettings;
                renderCategory(currentCategory);
            }
        });
    } else if (itemType === 'faceFeature') {
        const featureId = card.dataset.featureId;
        appearanceData.faceFeatures[featureId] = value;
        post('appearance_change_face_feature', appearanceData.faceFeatures);
    } else if (itemType === 'headBlend') {
        const blendId = card.dataset.blendId;
        appearanceData.headBlend[blendId] = value;
        post('appearance_change_head_blend', appearanceData.headBlend);
    } else if (itemType === 'headOverlay') {
        const overlayKey = card.dataset.overlayId;
        if (overlayKey) {
            appearanceData.headOverlays[overlayKey].style = value;
            if (value > 0 && appearanceData.headOverlays[overlayKey].opacity === 0) {
                appearanceData.headOverlays[overlayKey].opacity = 1.0;
                const opInput = card.querySelector('.opacity-range');
                const opLabel = card.querySelector('.opacity-value');
                if (opInput) opInput.value = 1.0;
                if (opLabel) opLabel.innerText = "100%";
            }
            post('appearance_change_head_overlay', appearanceData.headOverlays);
        }
    } else if (itemType === 'tattoo') {
        const cat = card.dataset.tattooCategory;
        const tattooIndex = Math.round(value);
        if (!appearanceData.tattoos) appearanceData.tattoos = {};
        if (!appearanceData.tattoos[cat]) appearanceData.tattoos[cat] = [];
        
        if (tattooIndex === 0) {
            post('appearance_change_tattoos', appearanceData.tattoos);
        } else {
            const tattooList = appearanceSettings.tattoos.items[cat];
            if (tattooList && tattooList[tattooIndex - 1]) {
                const tattoo = JSON.parse(JSON.stringify(tattooList[tattooIndex - 1]));
                
                post('appearance_preview_tattoo', {
                    data: appearanceData.tattoos,
                    tattoo: tattoo
                });
            }
        }

        // Update applied count UI
        const countLabel = card.querySelector('.count-val');
        if (countLabel) countLabel.innerText = appearanceData.tattoos[cat].length;
    }
}

function updateItemColor(index, colorIndex, isSecondary) {
    const card = document.querySelector(`.item-card[data-index="${index}"]`);
    if (!card) return;
    const itemType = card.dataset.type;

    // Update active state in UI
    const group = isSecondary ? card.querySelector('.secondary-color-group') : card.querySelector('.color-selection-group:not(.secondary-color-group)');
    if (group) {
        group.querySelectorAll('.color-option').forEach((opt, i) => {
            opt.classList.toggle('active', i === colorIndex);
        });
    }

    if (itemType === 'hair') {
        if (isSecondary) {
            appearanceData.hair.highlight = colorIndex;
        } else {
            appearanceData.hair.color = colorIndex;
        }
        post('appearance_change_hair', {
            style: appearanceData.hair.style,
            color: appearanceData.hair.color,
            highlight: appearanceData.hair.highlight
        });
    } else if (itemType === 'headOverlay') {
        const overlayKey = card.dataset.overlayId;
        if (overlayKey) {
            if (isSecondary) {
                appearanceData.headOverlays[overlayKey].secondColor = colorIndex;
            } else {
                appearanceData.headOverlays[overlayKey].color = colorIndex;
            }
            if (appearanceData.headOverlays[overlayKey].style > 0 && appearanceData.headOverlays[overlayKey].opacity === 0) {
                appearanceData.headOverlays[overlayKey].opacity = 1.0;
                const opInput = card.querySelector('.opacity-range');
                const opLabel = card.querySelector('.opacity-value');
                if (opInput) opInput.value = 1.0;
                if (opLabel) opLabel.innerText = "100%";
            }
            post('appearance_change_head_overlay', appearanceData.headOverlays);
        }
    }
}

function turnAround() {
    post('appearance_turn_around');
}

function rotate(angle) {
    if (angle > 0) {
        post('rotate_right');
    } else {
        post('rotate_left');
    }
}

function setCamera(view) {
    post('appearance_set_camera', view);
}

// Helpers
function getComponentName(id) {
    const map = {
        0: { locale: "head", config: "head" },
        1: { locale: "mask", config: "masks" },
        2: { locale: "hair", config: "hair" },
        3: { locale: "upperBody", config: "upperBody" },
        4: { locale: "lowerBody", config: "lowerBody" },
        5: { locale: "bags", config: "bags" },
        6: { locale: "shoes", config: "shoes" },
        7: { locale: "scarfAndChains", config: "scarfAndChains" },
        8: { locale: "shirt", config: "shirts" },
        9: { locale: "bodyArmor", config: "bodyArmor" },
        10: { locale: "decals", config: "decals" },
        11: { locale: "jackets", config: "jackets" }
    };
    return map[id] || { locale: id, config: id };
}

function getPropName(id) {
    const names = {
        0: "hats", 1: "glasses", 2: "ear", 6: "watches", 7: "bracelets"
    };
    return names[id] || id;
}

function getComponentValue(id) {
    const comp = appearanceData.components.find(c => c.component_id === id);
    return comp ? comp.drawable : 0;
}

function getComponentTexture(id) {
    const comp = appearanceData.components.find(c => c.component_id === id);
    return comp ? comp.texture : 0;
}

function getPropValue(id) {
    const prop = appearanceData.props.find(p => p.prop_id === id);
    return prop ? prop.drawable : -1;
}

function getPropTexture(id) {
    const prop = appearanceData.props.find(p => p.prop_id === id);
    return prop ? prop.texture : -1;
}

// Event Listeners
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCategory(btn.dataset.category);
    });
});

document.getElementById('submit-btn').addEventListener('click', () => {
    post('appearance_save', appearanceData);
});

document.getElementById('exit-btn').addEventListener('click', () => {
    post('appearance_exit');
});

// Keyboard Navigation
window.addEventListener('keydown', (e) => {
    if (app.style.display === 'none') return;

    if (e.key === 'ArrowLeft') {
        changeValue(focusedItemIndex, -1);
    } else if (e.key === 'ArrowRight') {
        changeValue(focusedItemIndex, 1);
    } else if (e.key === 'ArrowUp') {
        focusedItemIndex = Math.max(0, focusedItemIndex - 1);
        updateFocus();
    } else if (e.key === 'ArrowDown') {
        const max = document.querySelectorAll('.item-card').length - 1;
        focusedItemIndex = Math.min(max, focusedItemIndex + 1);
        updateFocus();
    } else if (e.key === 'a' || e.key === 'A') {
        post('rotate_left');
    } else if (e.key === 'd' || e.key === 'D') {
        post('rotate_right');
    } else if (e.key === 'Escape') {
        post('appearance_exit');
    }
});

// Custom Heritage (Herança) Data and Logic
const fathers = [
    { id: 0, name: "Benjamin" },
    { id: 1, name: "Daniel" },
    { id: 2, name: "Joshua" },
    { id: 3, name: "Noah" },
    { id: 4, name: "Andrew" },
    { id: 5, name: "Joan" },
    { id: 6, name: "Alex" },
    { id: 7, name: "Isaac" },
    { id: 8, name: "Evan" },
    { id: 9, name: "Ethan" },
    { id: 10, name: "Vincent" },
    { id: 11, name: "Angel" },
    { id: 12, name: "Diego" },
    { id: 13, name: "Adrian" },
    { id: 14, name: "Gabriel" },
    { id: 15, name: "Michael" },
    { id: 16, name: "Santiago" },
    { id: 17, name: "Kevin" },
    { id: 18, name: "Louis" },
    { id: 19, name: "Samuel" },
    { id: 20, name: "Anthony" },
    { id: 42, name: "Claude" },
    { id: 43, name: "Niko" },
    { id: 44, name: "John" }
];

const mothers = [
    { id: 21, name: "Hannah" },
    { id: 22, name: "Aubrey" },
    { id: 23, name: "Jasmine" },
    { id: 24, name: "Gisele" },
    { id: 25, name: "Amelia" },
    { id: 26, name: "Isabella" },
    { id: 27, name: "Zoe" },
    { id: 28, name: "Ava" },
    { id: 29, name: "Camilla" },
    { id: 30, name: "Violet" },
    { id: 31, name: "Sophia" },
    { id: 32, name: "Eveline" },
    { id: 33, name: "Megan" },
    { id: 34, name: "Ashley" },
    { id: 35, name: "Emma" },
    { id: 36, name: "Giselle" },
    { id: 37, name: "Brianna" },
    { id: 38, name: "Natalie" },
    { id: 39, name: "Olivia" },
    { id: 40, name: "Elizabeth" },
    { id: 41, name: "Charlotte" },
    { id: 45, name: "Misty" }
];

// ─── PED SELECTOR ──────────────────────────────────────────────────────────────
let pedSearchQuery = '';
let currentPedIndex = 0;
let pedFilteredList = [];

function renderPed() {
    if (!appearanceSettings.ped || !appearanceSettings.ped.model) {
        itemsContainer.innerHTML = '<div class="no-tattoos-found">Nenhum modelo disponível.</div>';
        return;
    }

    const allModels = appearanceSettings.ped.model.items;
    currentPedIndex = appearanceData.model !== undefined ? appearanceData.model : 0;
    pedFilteredList = allModels.map((name, idx) => ({ name, idx }));

    itemsContainer.innerHTML = buildPedHtml(allModels);
    filterPedModels('');
}

function buildPedHtml(allModels) {
    const current = allModels[currentPedIndex] || '—';
    return `
        <div class="ped-container">
            <div class="ped-header-card">
                <div class="ped-current-badge">
                    <i class="fas fa-user-astronaut"></i>
                    <div class="ped-current-info">
                        <span class="ped-current-label">MODELO ATUAL</span>
                        <span class="ped-current-name" id="ped-current-name">${current}</span>
                    </div>
                </div>
                <div class="ped-nav-arrows">
                    <button class="arrow-btn dec" onclick="navPed(-1)" title="Anterior"><i class="fas fa-chevron-left"></i></button>
                    <span class="ped-counter" id="ped-counter">${currentPedIndex + 1} / ${allModels.length}</span>
                    <button class="arrow-btn inc" onclick="navPed(1)" title="Próximo"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>

            <div class="ped-search-wrapper">
                <i class="fas fa-magnifying-glass search-icon"></i>
                <input type="text" id="ped-search" class="ped-search-input"
                    placeholder="Pesquisar modelo..."
                    value="${pedSearchQuery}"
                    oninput="filterPedModels(this.value)">
            </div>

            <div id="ped-list" class="ped-list">
                <!-- injected by filterPedModels -->
            </div>
        </div>
    `;
}

function filterPedModels(query) {
    pedSearchQuery = query.toLowerCase().trim();
    const allModels = appearanceSettings.ped.model.items;

    pedFilteredList = allModels
        .map((name, idx) => ({ name, idx }))
        .filter(item => !pedSearchQuery || item.name.toLowerCase().includes(pedSearchQuery));

    const list = document.getElementById('ped-list');
    if (!list) return;

    if (pedFilteredList.length === 0) {
        list.innerHTML = '<div class="no-tattoos-found">Nenhum modelo encontrado.</div>';
        return;
    }

    list.innerHTML = pedFilteredList.map(item => `
        <div class="ped-list-item ${item.idx === currentPedIndex ? 'active' : ''}"
             onclick="selectPedModel(${item.idx})">
            <i class="fas fa-person ped-item-icon"></i>
            <span class="ped-item-name">${item.name}</span>
            ${item.idx === currentPedIndex ? '<i class="fas fa-check ped-item-check"></i>' : ''}
        </div>
    `).join('');
}

function navPed(dir) {
    const allModels = appearanceSettings.ped.model.items;
    currentPedIndex = (currentPedIndex + dir + allModels.length) % allModels.length;
    applyPedModel(currentPedIndex);
}

function selectPedModel(idx) {
    currentPedIndex = idx;
    applyPedModel(idx);
}

function applyPedModel(idx) {
    const allModels = appearanceSettings.ped.model.items;
    const model = allModels[idx];

    // Update visuals immediately
    const nameEl = document.getElementById('ped-current-name');
    const counterEl = document.getElementById('ped-counter');
    if (nameEl) nameEl.textContent = model;
    if (counterEl) counterEl.textContent = `${idx + 1} / ${allModels.length}`;

    // Re-render list to update active
    filterPedModels(pedSearchQuery);

    appearanceData.model = idx;
    post('appearance_change_model', model).then(newData => {
        if (newData) {
            appearanceData = newData.appearanceData;
            appearanceSettings = newData.appearanceSettings;
        }
    });
}

// ─── HERITAGE CUSTOM DROPDOWN HELPERS ──────────────────────────────────────────
function buildCustomDropdown(id, list, selectedId, type, gender) {

    const selectedItem = list.find(i => i.id === selectedId) || list[0];
    const optionsHtml = list.map(item => `
        <div class="cdd-option ${item.id === selectedId ? 'active' : ''}" 
             data-value="${item.id}"
             onclick="selectCustomDropdown('${id}', ${item.id}, '${type}', '${gender}')">
            ${item.name}
        </div>
    `).join('');

    return `
        <div class="custom-dropdown" id="${id}">
            <div class="cdd-selected" onclick="toggleCustomDropdown('${id}')">
                <span class="cdd-selected-text">${selectedItem ? selectedItem.name : '—'}</span>
                <i class="fas fa-chevron-down cdd-arrow"></i>
            </div>
            <div class="cdd-options-list">
                ${optionsHtml}
            </div>
        </div>
    `;
}

function toggleCustomDropdown(id) {
    const dd = document.getElementById(id);
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    // Close all others first
    document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
    if (!isOpen) dd.classList.add('open');
}

function selectCustomDropdown(id, value, type, gender) {
    const dd = document.getElementById(id);
    if (!dd) return;

    // Update visual
    const list = (type === 'shape' || type === 'extra') 
        ? (gender === 'father' ? fathers : mothers)
        : (gender === 'father' ? fathers : mothers);
    
    const selectedItem = list.find(i => i.id === parseInt(value));
    if (selectedItem) {
        dd.querySelector('.cdd-selected-text').textContent = selectedItem.name;
        dd.querySelectorAll('.cdd-option').forEach(opt => {
            opt.classList.toggle('active', parseInt(opt.dataset.value) === selectedItem.id);
        });
    }
    dd.classList.remove('open');
    changeParent(type, gender, value);
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown.open').forEach(d => d.classList.remove('open'));
    }
});

function renderHeritage() {
    if (!appearanceData.headBlend) {
        appearanceData.headBlend = {
            shapeFirst: 0,
            shapeSecond: 21,
            shapeThird: 0,
            skinFirst: 0,
            skinSecond: 21,
            skinThird: 0,
            shapeMix: 0.5,
            skinMix: 0.5,
            thirdMix: 0.0
        };
    }
    const hb = appearanceData.headBlend;

    const parentHtml = `
        <div class="heritage-container">
            <!-- SEÇÃO 1: FORMA DO ROSTO -->
            <div class="heritage-section-card">
                <div class="heritage-section-title">
                    <i class="fas fa-face-smile"></i>
                    <span>Forma do Rosto</span>
                </div>
                <div class="parent-selector-group">
                    <div class="parent-card">
                        <span class="control-label">PAI</span>
                        ${buildCustomDropdown('shape-father-dd', fathers, hb.shapeFirst, 'shape', 'father')}
                        <div class="parent-arrows">
                            <button class="arrow-btn dec" onclick="cycleParent('shape', 'father', -1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="arrow-btn inc" onclick="cycleParent('shape', 'father', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                    <div class="parent-card">
                        <span class="control-label">MÃE</span>
                        ${buildCustomDropdown('shape-mother-dd', mothers, hb.shapeSecond, 'shape', 'mother')}
                        <div class="parent-arrows">
                            <button class="arrow-btn dec" onclick="cycleParent('shape', 'mother', -1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="arrow-btn inc" onclick="cycleParent('shape', 'mother', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>
                <div class="control-container">
                    <div class="control-header">
                        <span class="control-label">MISTURA DO ROSTO</span>
                        <span id="shape-mix-value" class="item-value-badge">${Math.round(hb.shapeMix * 100)}%</span>
                    </div>
                    <div class="control-group">
                        <span class="mix-side-label">PAI</span>
                        <input type="range" id="shape-mix-range" class="range-input" min="0" max="1" step="0.05" value="${hb.shapeMix}" oninput="updateHeritageMix('shape', this.value)">
                        <span class="mix-side-label">MÃE</span>
                    </div>
                </div>
            </div>

            <!-- SEÇÃO 2: TOM DE PELE -->
            <div class="heritage-section-card">
                <div class="heritage-section-title">
                    <i class="fas fa-palette"></i>
                    <span>Tom de Pele</span>
                </div>
                <div class="parent-selector-group">
                    <div class="parent-card">
                        <span class="control-label">PAI</span>
                        ${buildCustomDropdown('skin-father-dd', fathers, hb.skinFirst, 'skin', 'father')}
                        <div class="parent-arrows">
                            <button class="arrow-btn dec" onclick="cycleParent('skin', 'father', -1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="arrow-btn inc" onclick="cycleParent('skin', 'father', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                    <div class="parent-card">
                        <span class="control-label">MÃE</span>
                        ${buildCustomDropdown('skin-mother-dd', mothers, hb.skinSecond, 'skin', 'mother')}
                        <div class="parent-arrows">
                            <button class="arrow-btn dec" onclick="cycleParent('skin', 'mother', -1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="arrow-btn inc" onclick="cycleParent('skin', 'mother', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>
                <div class="control-container">
                    <div class="control-header">
                        <span class="control-label">MISTURA DA PELE</span>
                        <span id="skin-mix-value" class="item-value-badge">${Math.round(hb.skinMix * 100)}%</span>
                    </div>
                    <div class="control-group">
                        <span class="mix-side-label">PAI</span>
                        <input type="range" id="skin-mix-range" class="range-input" min="0" max="1" step="0.05" value="${hb.skinMix}" oninput="updateHeritageMix('skin', this.value)">
                        <span class="mix-side-label">MÃE</span>
                    </div>
                </div>
            </div>

            <!-- SEÇÃO 3: ETNIA / MISTURA EXTRA -->
            <div class="heritage-section-card">
                <div class="heritage-section-title">
                    <i class="fas fa-dna"></i>
                    <span>Etnia / Mistura Extra</span>
                </div>
                <div class="parent-selector-group">
                    <div class="parent-card">
                        <span class="control-label">FACE ADICIONAL</span>
                        ${buildCustomDropdown('extra-father-dd', fathers, hb.shapeThird, 'extra', 'father')}
                        <div class="parent-arrows">
                            <button class="arrow-btn dec" onclick="cycleParent('extra', 'father', -1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="arrow-btn inc" onclick="cycleParent('extra', 'father', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                    <div class="parent-card">
                        <span class="control-label">PELE ADICIONAL</span>
                        ${buildCustomDropdown('extra-mother-dd', mothers, hb.skinThird, 'extra', 'mother')}
                        <div class="parent-arrows">
                            <button class="arrow-btn dec" onclick="cycleParent('extra', 'mother', -1)"><i class="fas fa-chevron-left"></i></button>
                            <button class="arrow-btn inc" onclick="cycleParent('extra', 'mother', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>
                <div class="control-container">
                    <div class="control-header">
                        <span class="control-label">MISTURA EXTRA</span>
                        <span id="extra-mix-value" class="item-value-badge">${Math.round(hb.thirdMix * 100)}%</span>
                    </div>
                    <div class="control-group">
                        <span class="mix-side-label">PAI</span>
                        <input type="range" id="extra-mix-range" class="range-input" min="0" max="1" step="0.05" value="${hb.thirdMix}" oninput="updateHeritageMix('extra', this.value)">
                        <span class="mix-side-label">MÃE</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    itemsContainer.innerHTML = parentHtml;
}

function changeParent(type, gender, value) {
    const id = parseInt(value);
    if (!appearanceData.headBlend) return;
    
    if (type === 'shape') {
        if (gender === 'father') appearanceData.headBlend.shapeFirst = id;
        else appearanceData.headBlend.shapeSecond = id;
    } else if (type === 'skin') {
        if (gender === 'father') appearanceData.headBlend.skinFirst = id;
        else appearanceData.headBlend.skinSecond = id;
    } else if (type === 'extra') {
        if (gender === 'father') appearanceData.headBlend.shapeThird = id;
        else appearanceData.headBlend.skinThird = id;
    }
    
    post('appearance_change_head_blend', appearanceData.headBlend);
}

function cycleParent(type, gender, dir) {
    if (!appearanceData.headBlend) return;
    
    let ddId, list, currentId;
    if (type === 'shape') {
        ddId = gender === 'father' ? 'shape-father-dd' : 'shape-mother-dd';
        list = gender === 'father' ? fathers : mothers;
        currentId = gender === 'father' ? appearanceData.headBlend.shapeFirst : appearanceData.headBlend.shapeSecond;
    } else if (type === 'skin') {
        ddId = gender === 'father' ? 'skin-father-dd' : 'skin-mother-dd';
        list = gender === 'father' ? fathers : mothers;
        currentId = gender === 'father' ? appearanceData.headBlend.skinFirst : appearanceData.headBlend.skinSecond;
    } else if (type === 'extra') {
        ddId = gender === 'father' ? 'extra-father-dd' : 'extra-mother-dd';
        list = gender === 'father' ? fathers : mothers;
        currentId = gender === 'father' ? appearanceData.headBlend.shapeThird : appearanceData.headBlend.skinThird;
    }
    
    let currentIdx = list.findIndex(item => item.id === currentId);
    if (currentIdx === -1) currentIdx = 0;
    const nextIdx = (currentIdx + dir + list.length) % list.length;
    const nextItem = list[nextIdx];
    
    // Update visual dropdown
    const dd = document.getElementById(ddId);
    if (dd) {
        dd.querySelector('.cdd-selected-text').textContent = nextItem.name;
        dd.querySelectorAll('.cdd-option').forEach(opt => {
            opt.classList.toggle('active', parseInt(opt.dataset.value) === nextItem.id);
        });
    }
    
    changeParent(type, gender, nextItem.id);
}

function updateHeritageMix(type, value) {
    if (!appearanceData.headBlend) return;
    value = parseFloat(value);
    
    if (type === 'shape') {
        appearanceData.headBlend.shapeMix = value;
        const valBadge = document.getElementById('shape-mix-value');
        if (valBadge) valBadge.innerText = `${Math.round(value * 100)}%`;
    } else if (type === 'skin') {
        appearanceData.headBlend.skinMix = value;
        const valBadge = document.getElementById('skin-mix-value');
        if (valBadge) valBadge.innerText = `${Math.round(value * 100)}%`;
    } else if (type === 'extra') {
        appearanceData.headBlend.thirdMix = value;
        const valBadge = document.getElementById('extra-mix-value');
        if (valBadge) valBadge.innerText = `${Math.round(value * 100)}%`;
    }
    
    post('appearance_change_head_blend', appearanceData.headBlend);
}

// Custom Tattoos Grid Logic

let currentTattooZone = 'ZONE_TORSO';
let tattooSearchQuery = '';

function renderTattoosGrid() {
    if (!appearanceSettings.tattoos) return;

    const zones = [
        { id: 'ZONE_TORSO', label: "Torso" },
        { id: 'ZONE_HEAD', label: "Cabeça" },
        { id: 'ZONE_LEFT_ARM', label: "Br. Esq" },
        { id: 'ZONE_RIGHT_ARM', label: "Br. Dir" },
        { id: 'ZONE_LEFT_LEG', label: "Perna Esq" },
        { id: 'ZONE_RIGHT_LEG', label: "Perna Dir" }
    ];

    const totalApplied = Object.values(appearanceData.tattoos || {}).reduce((acc, curr) => acc + (curr ? curr.length : 0), 0);

    const tattooHtml = `
        <div class="tattoo-grid-container">
            <div class="remove-all-container">
                <button class="remove-all-tattoos-btn" onclick="removeAllTattoosGrid()">
                    <i class="fas fa-trash-can"></i> REMOVER TODAS TATUAGENS (<span id="total-applied-count">${totalApplied}</span>)
                </button>
            </div>

            <!-- Zone Selector Buttons -->
            <div class="tattoo-zones-row">
                ${zones.map(z => `
                    <button class="zone-btn ${currentTattooZone === z.id ? 'active' : ''}" onclick="selectTattooZone('${z.id}')">
                        ${z.label}
                    </button>
                `).join('')}
            </div>

            <!-- Search Box -->
            <div class="tattoo-search-wrapper">
                <i class="fas fa-magnifying-glass search-icon"></i>
                <input type="text" id="tattoo-search" class="tattoo-search-input" placeholder="Buscar por nome..." value="${tattooSearchQuery}" oninput="searchTattoos(this.value)">
            </div>

            <!-- Grid -->
            <div id="tattoo-grid" class="tattoo-grid-items">
                <!-- Grid items injected here -->
            </div>
        </div>
    `;

    itemsContainer.innerHTML = tattooHtml;
    updateTattooGridItems();
}

function updateTattooGridItems() {
    const gridContainer = document.getElementById('tattoo-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const tattooList = appearanceSettings.tattoos.items[currentTattooZone] || [];
    if (!appearanceData.tattoos) appearanceData.tattoos = {};
    const appliedTattoos = appearanceData.tattoos[currentTattooZone] || [];

    const filteredList = tattooList.filter(t => {
        if (!tattooSearchQuery) return true;
        const name = (t.label || t.name || '').toLowerCase();
        return name.includes(tattooSearchQuery.toLowerCase());
    });

    if (filteredList.length === 0) {
        gridContainer.innerHTML = `<div class="no-tattoos-found">Nenhuma tatuagem encontrada.</div>`;
        return;
    }

    filteredList.forEach((tattoo) => {
        const isApplied = appliedTattoos.some(t => t.name === tattoo.name);
        const card = document.createElement('div');
        card.className = `tattoo-grid-card ${isApplied ? 'applied' : ''}`;
        card.innerHTML = `
            <div class="tattoo-card-info">
                <span class="tattoo-card-name">${tattoo.label || tattoo.name}</span>
                <span class="tattoo-card-id">${tattoo.name}</span>
            </div>
            <div class="tattoo-card-indicator">
                <i class="fas ${isApplied ? 'fa-check' : 'fa-plus'}"></i>
            </div>
        `;

        card.addEventListener('click', () => toggleGridTattoo(tattoo));
        card.addEventListener('mouseenter', () => previewGridTattoo(tattoo));

        gridContainer.appendChild(card);
    });
}

async function toggleGridTattoo(tattoo) {
    if (!appearanceData.tattoos) appearanceData.tattoos = {};
    if (!appearanceData.tattoos[currentTattooZone]) appearanceData.tattoos[currentTattooZone] = [];

    const cat = currentTattooZone;
    const existingIdx = appearanceData.tattoos[cat].findIndex(t => t.name === tattoo.name);
    
    if (existingIdx > -1) {
        appearanceData.tattoos[cat].splice(existingIdx, 1);
        await post('appearance_delete_tattoo', appearanceData.tattoos);
    } else {
        appearanceData.tattoos[cat].push(tattoo);
        const success = await post('appearance_apply_tattoo', {
            updatedTattoos: appearanceData.tattoos,
            tattoo: tattoo
        });
        if (success === false) {
            const revertIdx = appearanceData.tattoos[cat].findIndex(t => t.name === tattoo.name);
            if (revertIdx > -1) appearanceData.tattoos[cat].splice(revertIdx, 1);
        }
    }

    updateTattooGridItems();
    
    const totalApplied = Object.values(appearanceData.tattoos || {}).reduce((acc, curr) => acc + (curr ? curr.length : 0), 0);
    const totalLabel = document.getElementById('total-applied-count');
    if (totalLabel) totalLabel.innerText = totalApplied;
}

function previewGridTattoo(tattoo) {
    post('appearance_preview_tattoo', {
        data: appearanceData.tattoos,
        tattoo: tattoo
    });
}

function selectTattooZone(zoneId) {
    currentTattooZone = zoneId;
    renderTattoosGrid();
}

function searchTattoos(val) {
    tattooSearchQuery = val;
    updateTattooGridItems();
}

function removeAllTattoosGrid() {
    appearanceData.tattoos = {};
    post('appearance_change_tattoos', {});
    renderTattoosGrid();
}


// ─── SCALE WIDGET ────────────────────────────────────────────────────────────
(function initScaleWidget() {
    const STORAGE_KEY = 'zn_appearance_scale';
    const DEFAULT_SCALE = 100;

    function getSavedScale() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? parseInt(saved, 10) : DEFAULT_SCALE;
    }

    function applyScale(value) {
        value = Math.min(100, Math.max(60, parseInt(value, 10)));
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.style.transform = value === 100 ? '' : `scale(${value / 100})`;
            appEl.style.transformOrigin = 'center center';
        }
        const slider = document.getElementById('scale-slider');
        const display = document.getElementById('scale-value-display');
        if (slider) slider.value = value;
        if (display) display.textContent = value + '%';
        localStorage.setItem(STORAGE_KEY, value);
    }

    function adjustScale(delta) {
        const slider = document.getElementById('scale-slider');
        if (!slider) return;
        applyScale(parseInt(slider.value, 10) + delta);
    }

    function resetScale() {
        applyScale(DEFAULT_SCALE);
    }

    function toggleScalePopover() {
        const popover = document.getElementById('scale-popover');
        const btn = document.getElementById('scale-toggle-btn');
        if (!popover) return;
        const isOpen = popover.classList.toggle('open');
        if (btn) btn.classList.toggle('active', isOpen);
    }

    // Close popover when clicking outside
    document.addEventListener('click', function (e) {
        const widget = document.getElementById('scale-widget');
        if (widget && !widget.contains(e.target)) {
            const popover = document.getElementById('scale-popover');
            const btn = document.getElementById('scale-toggle-btn');
            if (popover) popover.classList.remove('open');
            if (btn) btn.classList.remove('active');
        }
    });

    // Expose functions globally so inline onclick handlers work
    window.applyScale = applyScale;
    window.adjustScale = adjustScale;
    window.resetScale = resetScale;
    window.toggleScalePopover = toggleScalePopover;

    // Apply saved scale on load
    document.addEventListener('DOMContentLoaded', function () {
        applyScale(getSavedScale());
    });

    // Also apply when the NUI becomes visible (message from Lua)
    const _origAddEventListener = window.addEventListener.bind(window);
    // Re-apply scale whenever appearance_display fires
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'appearance_display') {
            setTimeout(() => applyScale(getSavedScale()), 50);
        }
    });
})();
