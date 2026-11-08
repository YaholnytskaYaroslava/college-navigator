const buttons = document.querySelectorAll('.floor-btn');
const images = document.querySelectorAll('.svgMap image');
const routeLayer = document.querySelector('.route-layer');

let allPoints = [];
let allEdges = [];

//перемикання поверхами
const activate = (floorNum) => {
    buttons.forEach(b => b.classList.toggle('active', +b.dataset.floor === floorNum))
    images.forEach((img, i)=> img.classList.toggle('active', i === floorNum - 1))

    if(allPoints.length > 0){ drawFullGraph(floorNum);}
}

buttons.forEach(btn=>{
    btn.addEventListener('click', ()=> activate(+btn.dataset.floor));
})



//перемикання стрілками
document.addEventListener('keydown', (e)=> {
    const active = document.querySelector('.floor-btn.active');
    if (!active) return;

    let currentFloor = +active.dataset.floor;

    if(e.key === 'ArrowUp') currentFloor = currentFloor < 3 ? currentFloor + 1 : 1;
    else if (e.key === 'ArrowDown') currentFloor = currentFloor > 1 ? currentFloor - 1 : 3;
    else return;

    activate(currentFloor);
})

let activeRoute = [];

function drawFullGraph(floorNum){
    const floorPoints = allPoints.filter(p => Number(p.floor)=== Number(floorNum));
    const pointMap = new Map(allPoints.map(p => [p.id, p]));

    let svg = '';
    allEdges.forEach(edge => {
        const nodeA = pointMap.get(edge.node_a);
        const nodeB = pointMap.get(edge.node_b);

        if(nodeA && nodeB && Number(nodeA.floor)===Number(floorNum) && Number(nodeB.floor)===Number(floorNum)){
            const isInRoute = activeRoute.length > 0 && (
                (activeRoute.includes(edge.node_a) && activeRoute.includes(edge.node_b) && 
                Math.abs(activeRoute.indexOf(edge.node_a) - activeRoute.indexOf(edge.node_b)) === 1)
            );

            if (isInRoute) {
                svg += `<line x1="${nodeA.x}" y1="${nodeA.y}" x2="${nodeB.x}" y2="${nodeB.y}" stroke="#0051fffc" stroke-width="2" />`;
            } else {
                svg += `<line x1="${nodeA.x}" y1="${nodeA.y}" x2="${nodeB.x}" y2="${nodeB.y}" stroke="#9aa9bd6e" stroke-width="2" />`;
            }  
        }
    })

    // Малює точки 
    floorPoints.forEach(point => {
        svg += `<circle cx="${point.x}" cy="${point.y}" r="3" fill="#6a8693" class="map-node" data-id="${point.id}" style="cursor: pointer;">
            <title>${point.name || point.id} (Поверх: ${point.floor})</title></circle>`;
    });
    routeLayer.innerHTML = svg;
}

Promise.all([
    fetch('/api/points').then(res => res.json()),
    fetch('/api/edges').then(res => res.json())
])
.then(([nodes, edges])=>{
    allPoints = nodes;
    allEdges = edges;

    const datalist = document.getElementById('points-list');
    datalist.innerHTML = '';
    allPoints.forEach(point => {
        if (point.name) {
            const option = document.createElement('option');
            option.value = point.name;
            datalist.appendChild(option);
        }
    });
   
    drawFullGraph(1);
})
.catch(error => console.error('Помилка завантаження графа', error));


function algorithmDijkstra (startId, endId, points, edges, blockedEdge = null) {
    const graph={};
    points.forEach(p => graph[p.id]={});

    edges.forEach(e=>{
        const edge1 = `${e.node_a}-${e.node_b}`;
        const edge2 = `${e.node_b}-${e.node_a}`;

        if(blockedEdge && (edge1 === blockedEdge || edge2 === blockedEdge)){
            return;
        }

        let weight = e.weight || 1;
        graph[e.node_a][e.node_b]=weight;
        graph[e.node_b][e.node_a]=weight;
    })

    let shortestDistance = {};
    let path = {};
    let unvisited = new Set();

    points.forEach(p=> {
        shortestDistance[p.id] = Infinity;
        path[p.id]=null;
        unvisited.add(p.id);
    })

    shortestDistance[startId]=0;

    while(unvisited.size >0){
        let activeId = null;
        let minDist = Infinity;

        unvisited.forEach(id =>{
            if(shortestDistance[id]<minDist){
                minDist=shortestDistance[id];
                activeId = id;
            }
        })

        if(activeId === null || shortestDistance[activeId]=== Infinity) break;
        if (activeId === endId) break;

        unvisited.delete(activeId);

        const neighbors = graph[activeId] || {};
        for(let neighbor in neighbors){
            if(unvisited.has(neighbor)){
                let newDistance = shortestDistance[activeId] + neighbors[neighbor];
                if(newDistance< shortestDistance[neighbor]){
                    shortestDistance[neighbor]=newDistance;
                    path[neighbor]=activeId;
                }
            }
        }
    }

    let pathReady = [];
    let actId = endId;
    while(actId !== null){
        pathReady.unshift(actId);
        actId = path[actId];
    }
    if(pathReady.length === 1 && pathReady[0] !== startId) return [];

    return pathReady;
}


let possibleRoutes =[];
let routeIndex = 0;

//кнопка знайти
document.getElementById('find-route-btn').addEventListener('click', ()=>{
    const startName =document.getElementById('start-point').value.trim();
    const endName = document.getElementById('end-point').value.trim();

    if(!startName  || !endName){
        alert('Введіть точки, ~(≧▽≦)~');
        return;
    }

    let startPoint = allPoints.find(p=> p.name === startName); 
    let endPoint = allPoints.find(p=> p.name === endName); 

    if(!startPoint){ alert(`Не існує ${startName}, (\`⌒\`)`); return;
    }
    if(!endPoint){ alert(`Не існує ${endName}, (\`⌒\`)`); return;
    }

    possibleRoutes = algorithmYen(startPoint.id, endPoint.id, allPoints, allEdges);
    
    routeIndex = 0;
    activeRoute = possibleRoutes[routeIndex];
    updateRouteArrows();
    activate(startPoint.floor);
})

//стрілочки     
function updateRouteArrows() {
    const arrow21 = document.getElementById('arrow-2-1');
    const arrow32 = document.getElementById('arrow-3-2');

    document.querySelectorAll('.arrow').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.arrow-ap').forEach(s => s.classList.remove('active'));

    if (activeRoute.length < 2) return;

    const pointMap = new Map(allPoints.map(p => [p.id, p]));

    for (let i = 0; i < activeRoute.length - 1; i++) {
        const pA = pointMap.get(activeRoute[i]);
        const pB = pointMap.get(activeRoute[i + 1]);

        if (pA && pB && pA.floor !== pB.floor) {
            let targetArrowId = null;
            if ((pA.floor === 1 && pB.floor === 2) || (pA.floor === 2 && pB.floor === 1)) {
                targetArrowId = 'arrow-2-1';
            } else if ((pA.floor === 2 && pB.floor === 3) || (pA.floor === 3 && pB.floor === 2)) {
                targetArrowId = 'arrow-3-2';
            }

            if (targetArrowId) {
                const arrowContainer = document.getElementById(targetArrowId);
                if (arrowContainer) {
                    arrowContainer.classList.add('active');
                    const spans = arrowContainer.querySelectorAll('.arrow-ap');
                    
                    //spans[0] — це ↑ spans[1] — це ↓
                    if (pA.floor < pB.floor) {
                        //вгору
                        if (spans[0]) spans[0].classList.add('active');
                    } else {
                        //вниз
                        if (spans[1]) spans[1].classList.add('active');
                    }
                }
            }
        }
    }
}

//змінити шлях
function algorithmYen(startId, endId, points, edges){
    let routes = [];
    let primaryPath = algorithmDijkstra(startId, endId, points, edges, null);
    if(primaryPath.length === 0) return routes;

    routes.push(primaryPath);

    for(let i=0; i<primaryPath.length - 1; i++){
        let blockEdge = `${primaryPath[i]}-${primaryPath[i+1]}`;
        let altPath = algorithmDijkstra(startId, endId, points, edges, blockEdge);
    
        if(altPath.length>0){
            let isDuplicate = routes.some(r=>{
                return r.length=== altPath.length && r.every((val, idx) => val ===altPath[idx]);
            })
            if(!isDuplicate){routes.push(altPath);}
        }
    }
    return routes;
}


//кнопка змінити шлях
document.getElementById('alt-route-btn').addEventListener('click', ()=>{
    if(possibleRoutes.length === 0 ){ alert(`Спочатку натисни на "Знайти"`); return;
    }

    routeIndex++;
    if(routeIndex < possibleRoutes.length){
        activeRoute = possibleRoutes[routeIndex];
        alert(`Маршрут змінено`);

        let startName = document.getElementById('start-point').value.trim();
        let startPoint = allPoints.find(p=> p.name === startName);

        updateRouteArrows();
        activate(startPoint.floor);
    } else {
        alert(`Немає інших маршрутів`);
        routeIndex = possibleRoutes.length - 1;
    }
})

//натискання на карту
let selectionState = 'from'; 

routeLayer.addEventListener('click', (e) => {
    const nodeGroup = e.target.closest('.map-node');
    if (!nodeGroup) return; 

    const pointId = nodeGroup.dataset.id;
    
    const point = allPoints.find(p => p.id === pointId);

    if (!point) return;

    if (selectionState === 'from') {
        
        document.getElementById('start-point').value = point.name;
        selectionState = 'to';
    } else {
        //другий клік
        document.getElementById('end-point').value = point.name;
        selectionState = 'from'; 

        document.getElementById('find-route-btn').click();
    }
});

//інформаційна кнопка
let infoBtn = document.querySelector('#info');
let infoBlock = document.querySelector('.info-block');

infoBtn.addEventListener('click', ()=>{
    if (infoBlock.style.display === 'none' || infoBlock.style.display === '') {
        infoBlock.style.display = 'block'; // Показати
    } else {
        infoBlock.style.display = 'none';  // Сховати
    }
})
