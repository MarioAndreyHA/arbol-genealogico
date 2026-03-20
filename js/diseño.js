let familiares = [];
let modalEdicion;

document.addEventListener('DOMContentLoaded', () => {
    modalEdicion = new bootstrap.Modal(document.getElementById('modalEdicion'));
    const datosGuardados = localStorage.getItem('arbolGenealogico');
    if (datosGuardados) {
        familiares = JSON.parse(datosGuardados);
    }
    actualizarInterfaz();
});

// --- CÁLCULO DE EDADES Y AÑOS ---
function calcularEdadTexto(fechaNac, esFallecido, fechaFall) {
    if (!fechaNac) return "";
    
    const anioNac = fechaNac.split('-')[0];
    const nacimiento = new Date(fechaNac + "T00:00:00");
    const fin = (esFallecido && fechaFall) ? new Date(fechaFall + "T00:00:00") : new Date();
    
    let edad = fin.getFullYear() - nacimiento.getFullYear();
    const mes = fin.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && fin.getDate() < nacimiento.getDate())) {
        edad--;
    }
    
    if (esFallecido) {
        const anioFall = fechaFall ? fechaFall.split('-')[0] : "???";
        return `✝ ${anioNac} - ${anioFall} (${edad} años)`;
    } else {
        return `${anioNac} - Presente (${edad} años)`;
    }
}

// --- LÓGICA INTELIGENTE DE MENÚS ---
function actualizarSelects(idIgnorar = null) {
    const selectPadre = document.getElementById('padreId');
    const selectEditPadre = document.getElementById('editPadreId');
    const htmlPadres = '<option value="">Ninguno (Es inicio de familia)</option>' + generarOpcionesPadres(idIgnorar);
    if(selectPadre) selectPadre.innerHTML = htmlPadres;
    if(selectEditPadre) selectEditPadre.innerHTML = htmlPadres;

    const selectPareja = document.getElementById('parejaId');
    const selectEditPareja = document.getElementById('editParejaId');
    const htmlParejas = '<option value="">Ninguno (Soltero/a)</option>' + generarOpcionesParejas(idIgnorar);
    if(selectPareja) selectPareja.innerHTML = htmlParejas;
    if(selectEditPareja) selectEditPareja.innerHTML = htmlParejas;
}

function generarOpcionesPadres(idIgnorar) {
    let opciones = "";
    const personasPrincipales = familiares.filter(fam => !fam.parejaId);
    
    personasPrincipales.forEach(principal => {
        if(principal.id === idIgnorar) return; 
        const pareja = familiares.find(f => f.parejaId === principal.id);
        if(pareja && pareja.id === idIgnorar) return; 

        if(pareja) {
            opciones += `<option value="${principal.id}">👪 ${principal.nombre} y ${pareja.nombre}</option>`;
        } else {
            opciones += `<option value="${principal.id}">👤 ${principal.nombre}</option>`;
        }
    });
    return opciones;
}

function generarOpcionesParejas(idIgnorar) {
    let opciones = "";
    familiares.forEach(fam => {
        if(fam.id === idIgnorar) return;
        const tieneParejaDeclarada = fam.parejaId !== null;
        const alguienLoTieneDePareja = familiares.some(f => f.parejaId === fam.id);
        if(!tieneParejaDeclarada && !alguienLoTieneDePareja) {
            opciones += `<option value="${fam.id}">👤 ${fam.nombre}</option>`;
        }
    });
    return opciones;
}

// --- GUARDAR Y ACTUALIZAR ---
document.getElementById('formFamiliar').addEventListener('submit', function(e) {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const parentesco = document.getElementById('parentesco').value;
    const genero = document.querySelector('input[name="genero"]:checked').value;
    
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const esFallecido = document.getElementById('esFallecido').checked;
    const fechaFallecimiento = esFallecido ? document.getElementById('fechaFallecimiento').value : null;

    const padreId = document.getElementById('padreId').value;
    const parejaId = document.getElementById('parejaId').value;

    const nuevoFamiliar = {
        id: Date.now().toString(),
        nombre: nombre,
        parentesco: parentesco,
        genero: genero,
        fechaNacimiento: fechaNacimiento,
        esFallecido: esFallecido,
        fechaFallecimiento: fechaFallecimiento,
        padreId: padreId || null,
        parejaId: parejaId || null
    };

    familiares.push(nuevoFamiliar);
    guardarDatos();
    
    this.reset();
    document.getElementById('divFechaFallecimiento').style.display = 'none';
});

document.getElementById('btnLimpiar').addEventListener('click', function() {
    if(confirm('¿Estás seguro de borrar todo?')) {
        familiares = [];
        guardarDatos();
    }
});

function guardarDatos() {
    localStorage.setItem('arbolGenealogico', JSON.stringify(familiares));
    actualizarInterfaz();
}

function actualizarInterfaz() {
    actualizarSelects();
    dibujarArbolD3();
}


// --- MOTOR GRÁFICO D3.JS ---
function dibujarArbolD3() {
    const contenedor = document.getElementById('contenedorArbol');
    contenedor.innerHTML = ''; 

    if (familiares.length === 0) {
        contenedor.innerHTML = '<p class="text-muted mt-5 text-center">Aún no hay familiares registrados, ¡Agrega el primero!</p>';
        return;
    }

    let nodes = familiares.map(d => Object.create(d));
    let links = [];
    const unionNodes = [];
    
    familiares.forEach(fam => {
        if (fam.parejaId) {
            unionNodes.push({ id: `union_${fam.id}`, isUnion: true, partnerA: fam.id, partnerB: fam.parejaId, level: 0 });
        }
    });
    nodes = nodes.concat(unionNodes);

    nodes.filter(n => !n.isUnion).forEach(n => n.level = 0);
    let cambiados = true;
    while(cambiados) {
        cambiados = false;
        nodes.filter(n => !n.isUnion).forEach(n => {
            if (n.padreId) {
                let padre = nodes.find(p => p.id === n.padreId);
                if (padre && n.level <= padre.level) {
                    n.level = padre.level + 1;
                    cambiados = true;
                }
            }
        });
    }
    nodes.filter(n => n.isUnion).forEach(u => {
        let parentNode = nodes.find(p => p.id === u.partnerA);
        if(parentNode) u.level = parentNode.level;
    });

    familiares.forEach(fam => {
        if (fam.parejaId) {
            const unionId = `union_${fam.id}`;
            links.push({ source: fam.id, target: unionId, type: 'pareja' });
            links.push({ source: fam.parejaId, target: unionId, type: 'pareja' });
        }
        if (fam.padreId) {
            let padreTienePareja = familiares.find(f => f.parejaId === fam.padreId);
            let padreEsPareja = familiares.find(f => f.id === fam.padreId && f.parejaId !== null);
            let unionIdTarget = null;
            if(padreTienePareja) unionIdTarget = `union_${padreTienePareja.id}`;
            else if(padreEsPareja) unionIdTarget = `union_${padreEsPareja.id}`;

            if(unionIdTarget) {
                links.push({ source: unionIdTarget, target: fam.id, type: 'hijo' });
            } else {
                links.push({ source: fam.padreId, target: fam.id, type: 'hijo' });
            }
        }
    });

    const width = contenedor.clientWidth;
    const height = contenedor.clientHeight;

    const svg = d3.select("#contenedorArbol").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => g.attr("transform", event.transform)))
        .append("g"); 

    const g = svg.append("g");

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === 'pareja' ? 40 : 120).strength(d => d.type === 'pareja' ? 1 : 0.5))
        .force("charge", d3.forceManyBody().strength(d => d.isUnion ? -50 : -600)) 
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("y", d3.forceY(d => (d.level * 180) - (height/4)).strength(0.8)) 
        .force("x", d3.forceX(width / 2).strength(0.05));

    const link = g.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("class", d => d.type === 'pareja' ? 'link-pareja' : 'link-hijo')
        .attr("stroke-width", d => d.type === 'pareja' ? 4 : 3);

    const node = g.append("g")
        .selectAll("g")
        .data(nodes.filter(n => !n.isUnion)) 
        .join("g")
        .attr("class", d => `nodo-d3 ${d.genero === 'F' ? 'mujer' : 'hombre'}`)
        .call(drag(simulation))
        .on("click", (event, d) => abrirModal(d.id));

    node.append("circle").attr("r", 25);
    
    node.append("text").attr("dy", "5").attr("text-anchor", "middle").text(d => d.genero === 'F' ? '👩' : '👨');
    node.append("text").attr("dy", "42").attr("text-anchor", "middle").text(d => d.nombre);
    node.append("text").attr("dy", "58").attr("text-anchor", "middle").attr("class", "parentesco").text(d => d.parentesco);
    
    // Aquí es donde se imprime el nuevo texto
    node.append("text")
        .attr("dy", "74")
        .attr("text-anchor", "middle")
        .attr("class", "fechas")
        .text(d => calcularEdadTexto(d.fechaNacimiento, d.esFallecido, d.fechaFallecimiento));

    const unionVisual = g.append("g")
        .selectAll("circle")
        .data(nodes.filter(n => n.isUnion))
        .join("circle")
        .attr("r", 4)
        .attr("fill", "#bdc3c7");

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
        unionVisual.attr("cx", d => d.x).attr("cy", d => d.y);
    });

    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        }
        function dragged(event, d) {
            d.fx = event.x; d.fy = event.y;
        }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        }
        return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
}


// --- EDICIÓN, ELIMINACIÓN Y RESPALDOS ---
function abrirModal(id) {
    const familiar = familiares.find(fam => fam.id === id);
    if(familiar) {
        document.getElementById('editId').value = familiar.id;
        document.getElementById('editNombre').value = familiar.nombre;
        document.getElementById('editParentesco').value = familiar.parentesco;
        
        if(familiar.genero === 'F') document.getElementById('editGeneroF').checked = true;
        else document.getElementById('editGeneroM').checked = true;
        
        document.getElementById('editFechaNacimiento').value = familiar.fechaNacimiento || "";
        document.getElementById('editEsFallecido').checked = familiar.esFallecido || false;
        document.getElementById('editDivFechaFallecimiento').style.display = familiar.esFallecido ? 'block' : 'none';
        document.getElementById('editFechaFallecimiento').value = familiar.fechaFallecimiento || "";

        actualizarSelects(familiar.id);
        
        document.getElementById('editPadreId').value = familiar.padreId || "";
        document.getElementById('editParejaId').value = familiar.parejaId || "";
        
        modalEdicion.show();
    }
}

document.getElementById('btnGuardarCambios').addEventListener('click', function() {
    const id = document.getElementById('editId').value;
    const index = familiares.findIndex(fam => fam.id === id);
    
    if(index !== -1) {
        familiares[index].nombre = document.getElementById('editNombre').value;
        familiares[index].parentesco = document.getElementById('editParentesco').value;
        familiares[index].genero = document.querySelector('input[name="editGenero"]:checked').value;
        
        familiares[index].fechaNacimiento = document.getElementById('editFechaNacimiento').value;
        familiares[index].esFallecido = document.getElementById('editEsFallecido').checked;
        familiares[index].fechaFallecimiento = familiares[index].esFallecido ? document.getElementById('editFechaFallecimiento').value : null;
        
        const padreId = document.getElementById('editPadreId').value;
        const parejaId = document.getElementById('editParejaId').value;
        
        familiares[index].padreId = padreId || null;
        familiares[index].parejaId = parejaId || null;
        
        guardarDatos();
        modalEdicion.hide();
    }
});

document.getElementById('btnEliminar').addEventListener('click', function() {
    const id = document.getElementById('editId').value;
    if(confirm('¿Seguro que deseas eliminar a este familiar?')) {
        familiares = familiares.filter(fam => fam.id !== id);
        familiares.forEach(fam => {
            if(fam.padreId === id) fam.padreId = null; 
            if(fam.parejaId === id) fam.parejaId = null;
        });
        guardarDatos();
        modalEdicion.hide();
    }
});

// Respaldo
document.getElementById('btnExportar')?.addEventListener('click', function() {
    if(familiares.length === 0) {
        alert('El árbol está vacío'); return;
    }
    const datosJSON = JSON.stringify(familiares, null, 2);
    const blob = new Blob([datosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mi_arbol_genealogico.json'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('btnImportar')?.addEventListener('click', function() {
    document.getElementById('inputFile').click();
});

document.getElementById('inputFile')?.addEventListener('change', function(event) {
    const archivo = event.target.files[0];
    if(!archivo) return; 
    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const datosCargados = JSON.parse(e.target.result);
            if(Array.isArray(datosCargados)) {
                familiares = datosCargados;
                guardarDatos();
                alert('¡Árbol cargado exitosamente!');
            }
        } catch(error) {
            alert('Error al leer el archivo JSON.');
        }
    };
    lector.readAsText(archivo);
    event.target.value = '';
});