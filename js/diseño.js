let familiares = [];
        let modalEdicion;

        document.addEventListener('DOMContentLoaded', () => {
            // Inicializamos la ventana modal de Bootstrap
            modalEdicion = new bootstrap.Modal(document.getElementById('modalEdicion'));
            
            const datosGuardados = localStorage.getItem('arbolGenealogico');
            if (datosGuardados) {
                familiares = JSON.parse(datosGuardados);
            }
            actualizarInterfaz();
        });

        // Crear nuevo familiar
        document.getElementById('formFamiliar').addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = document.getElementById('nombre').value;
            const parentesco = document.getElementById('parentesco').value;
            const padreId = document.getElementById('padreId').value;

            const nuevoFamiliar = {
                id: Date.now().toString(),
                nombre: nombre,
                parentesco: parentesco,
                padreId: padreId || null
            };

            familiares.push(nuevoFamiliar);
            guardarDatos();
            this.reset();
        });

        // Borrar todo el árbol
        document.getElementById('btnLimpiar').addEventListener('click', function() {
            if(confirm('¿Estás seguro de borrar todo?')) {
                familiares = [];
                guardarDatos();
            }
        });

        // Funciones principales de guardado e interfaz
        function guardarDatos() {
            localStorage.setItem('arbolGenealogico', JSON.stringify(familiares));
            actualizarInterfaz();
        }

        function actualizarInterfaz() {
            actualizarSelectPadres('padreId', null);
            dibujarArbol();
        }

        // Llena las listas desplegables (sirve para agregar y para editar)
        function actualizarSelectPadres(idElementoSelect, idIgnorar) {
            const select = document.getElementById(idElementoSelect);
            select.innerHTML = '<option value="">Ninguno (Raíz del árbol)</option>';
            familiares.forEach(fam => {
                // Evita que alguien sea padre de sí mismo
                if(fam.id !== idIgnorar) {
                    const opcion = document.createElement('option');
                    opcion.value = fam.id;
                    opcion.textContent = fam.nombre;
                    select.appendChild(opcion);
                }
            });
        }

        // Dibujar el árbol en pantalla
        function dibujarArbol() {
            const contenedor = document.getElementById('contenedorArbol');
            contenedor.innerHTML = ''; 

            if (familiares.length === 0) {
                contenedor.innerHTML = '<p class="text-muted mt-5">Aún no hay familiares registrados, ¡Agrega el primero!</p>';
                return;
            }

            const divTree = document.createElement('div');
            divTree.className = 'tree';
            
            const raices = familiares.filter(fam => !fam.padreId);
            
            if (raices.length > 0) {
                const ulPrincipal = document.createElement('ul');
                raices.forEach(raiz => {
                    ulPrincipal.appendChild(crearNodoYDescendientes(raiz));
                });
                divTree.appendChild(ulPrincipal);
                contenedor.appendChild(divTree);
            }
        }

        // Crear cada nodo de forma recursiva
        function crearNodoYDescendientes(familiar) {
            const li = document.createElement('li');
            
            const enlace = document.createElement('a');
            enlace.innerHTML = `<strong>${familiar.nombre}</strong><br><small class="text-muted">${familiar.parentesco}</small>`;
            
            // Aquí agregamos el evento para abrir la edición al hacer clic
            enlace.onclick = () => abrirModal(familiar.id);
            
            li.appendChild(enlace);

            const hijos = familiares.filter(fam => fam.padreId === familiar.id);
            
            if (hijos.length > 0) {
                const ulHijos = document.createElement('ul');
                hijos.forEach(hijo => {
                    ulHijos.appendChild(crearNodoYDescendientes(hijo));
                });
                li.appendChild(ulHijos);
            }

            return li;
        }

        // --- FUNCIONES PARA EDITAR Y ELIMINAR ---

        function abrirModal(id) {
            const familiar = familiares.find(fam => fam.id === id);
            if(familiar) {
                document.getElementById('editId').value = familiar.id;
                document.getElementById('editNombre').value = familiar.nombre;
                document.getElementById('editParentesco').value = familiar.parentesco;
                
                // Actualizar las opciones de padres excluyendo a la persona misma
                actualizarSelectPadres('editPadreId', familiar.id);
                document.getElementById('editPadreId').value = familiar.padreId || "";
                
                modalEdicion.show();
            }
        }

        // Guardar los cambios editados
        document.getElementById('btnGuardarCambios').addEventListener('click', function() {
            const id = document.getElementById('editId').value;
            const index = familiares.findIndex(fam => fam.id === id);
            
            if(index !== -1) {
                familiares[index].nombre = document.getElementById('editNombre').value;
                familiares[index].parentesco = document.getElementById('editParentesco').value;
                
                const nuevoPadreId = document.getElementById('editPadreId').value;
                familiares[index].padreId = nuevoPadreId || null;
                
                guardarDatos();
                modalEdicion.hide();
            }
        });

        // Eliminar un familiar
        document.getElementById('btnEliminar').addEventListener('click', function() {
            const id = document.getElementById('editId').value;
            if(confirm('¿Seguro que deseas eliminar a este familiar?')) {
                // Eliminar a la persona del arreglo
                familiares = familiares.filter(fam => fam.id !== id);
                
                // Si la persona tenía hijos, los desvinculamos para no perderlos (pasan a ser raíces)
                familiares.forEach(fam => {
                    if(fam.padreId === id) {
                        fam.padreId = null; 
                    }
                });
                
                guardarDatos();
                modalEdicion.hide();
            }
        });

        // --- FUNCIONES DE RESPALDO (EXPORTAR/IMPORTAR) ---

        // Función para descargar el archivo JSON
        document.getElementById('btnExportar')?.addEventListener('click', function() {
            if(familiares.length === 0) {
                alert('El árbol está vacío, no hay nada que descargar');
                return;
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

        // Función para abrir el selector de archivos
        document.getElementById('btnImportar')?.addEventListener('click', function() {
            document.getElementById('inputFile').click();
        });

        // Función para leer el archivo y restaurar el árbol
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
                    } else {
                        alert('El archivo no parece tener el formato correcto');
                    }
                } catch(error) {
                    alert('Hubo un error al leer el archivo, asegúrate de que sea el JSON correcto');
                }
            };
            lector.readAsText(archivo);
            event.target.value = ''; // Limpiar el input
        });