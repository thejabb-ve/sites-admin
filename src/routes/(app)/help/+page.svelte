<script lang="ts">
	let openSection = $state<string | null>(null);

	function toggle(id: string) {
		openSection = openSection === id ? null : id;
	}
</script>

<svelte:head><title>Ayuda — Panel</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold text-gray-900">Centro de ayuda</h1>
		<p class="text-sm text-gray-500 mt-1">Guías para gestionar proyectos, dominios y contenido.</p>
	</div>

	<!-- ── Sección 1: Cómo conectar un dominio ── -->
	<section class="bg-white border border-gray-200 rounded-lg overflow-hidden">
		<button
			onclick={() => toggle('domains')}
			class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
		>
			<div class="flex items-center gap-3">
				<span class="text-lg">🌐</span>
				<span class="font-medium text-gray-900">Cómo conectar un dominio</span>
			</div>
			<span class="text-gray-400 text-sm">{openSection === 'domains' ? '▲' : '▼'}</span>
		</button>

		{#if openSection === 'domains'}
			<div class="px-5 pb-6 border-t border-gray-100 space-y-5">
				<div class="pt-4">
					<p class="text-sm text-gray-600">Cada proyecto puede tener un dominio personalizado que se configura automáticamente en Cloudflare y Vercel.</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Paso 1 — Buscar disponibilidad</h3>
					<p class="text-sm text-gray-600">
						Navega a <strong>Proyecto → Dominios</strong> y escribe el dominio deseado (ej. <code class="bg-gray-100 px-1 rounded text-xs">micliente.com</code>).
						El sistema comprueba si está disponible para comprar a través de CF Registrar y muestra el precio anual.
					</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Paso 2 — Confirmar compra o conectar zona existente</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li><strong>Comprar nuevo:</strong> el sistema compra el dominio a través de CF Registrar y crea la zona automáticamente.</li>
						<li><strong>Conectar existente:</strong> si ya tienes la zona en Cloudflare, pega el Zone ID y el sistema la usa directamente.</li>
					</ul>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Paso 3 — Configuración automática</h3>
					<p class="text-sm text-gray-600 mb-2">El sistema realiza los siguientes pasos en segundo plano:</p>
					<ol class="text-sm text-gray-600 space-y-1 list-decimal list-inside">
						<li>Crea o localiza la zona Cloudflare del dominio.</li>
						<li>Añade el dominio al proyecto en Vercel (apex + www).</li>
						<li>Crea el registro CNAME <code class="bg-gray-100 px-1 rounded text-xs">www</code> apuntando a Vercel.</li>
						<li>Crea un registro A en el apex para la regla de redirección.</li>
						<li>Configura Cache Rule (30 días en edge).</li>
						<li>Configura Redirect Rule <code class="bg-gray-100 px-1 rounded text-xs">dominio.com → https://www.dominio.com</code>.</li>
					</ol>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Tiempos de propagación</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li><strong>Zona CF:</strong> ~10–30 segundos tras la compra.</li>
						<li><strong>DNS global:</strong> 5–30 minutos (puede llegar a 48 h en casos extremos).</li>
						<li><strong>Verificación Vercel:</strong> automática una vez que el CNAME apunta correctamente.</li>
					</ul>
				</div>

				<div class="bg-amber-50 border border-amber-200 rounded p-3">
					<p class="text-xs text-amber-800">
						<strong>Nota:</strong> El wizard muestra el estado en tiempo real (polling cada 3 s). Si el proceso queda en error, revisa el panel de Cloudflare o contacta soporte.
					</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- ── Sección 2: Manual de marca ── -->
	<section class="bg-white border border-gray-200 rounded-lg overflow-hidden">
		<button
			onclick={() => toggle('brand')}
			class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
		>
			<div class="flex items-center gap-3">
				<span class="text-lg">🎨</span>
				<span class="font-medium text-gray-900">Manual de marca</span>
			</div>
			<span class="text-gray-400 text-sm">{openSection === 'brand' ? '▲' : '▼'}</span>
		</button>

		{#if openSection === 'brand'}
			<div class="px-5 pb-6 border-t border-gray-100 space-y-5">
				<div class="pt-4">
					<p class="text-sm text-gray-600">La configuración de marca afecta a toda la plantilla del proyecto.</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Colores</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li><strong>Color primario:</strong> se aplica a botones, enlaces y acentos.</li>
						<li><strong>Color de fondo:</strong> fondo principal de la página.</li>
						<li><strong>Color de texto:</strong> texto base del sitio.</li>
					</ul>
					<p class="text-xs text-gray-400 mt-2">Usa valores hexadecimales (ej. <code class="bg-gray-100 px-1 rounded">#1a56db</code>) o HSL.</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Tipografías</h3>
					<p class="text-sm text-gray-600">
						Puedes elegir una fuente de título y una de cuerpo. Se cargan desde Google Fonts automáticamente.
						Elige fuentes con buena legibilidad en pantalla para el cuerpo (Inter, Lato, Open Sans).
					</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Bordes y sombras</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li><strong>Border radius:</strong> controla el redondeo de tarjetas y botones (0 = cuadrado, 1rem = muy redondeado).</li>
						<li><strong>Sombras:</strong> presets de box-shadow para tarjetas. Usa "none" para un diseño flat.</li>
					</ul>
				</div>

				<div class="bg-blue-50 border border-blue-200 rounded p-3">
					<p class="text-xs text-blue-800">
						Los cambios de marca se aplican en tiempo real en la vista previa. Publica para que los visitantes los vean.
					</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- ── Sección 3: Gestión de contenido ── -->
	<section class="bg-white border border-gray-200 rounded-lg overflow-hidden">
		<button
			onclick={() => toggle('content')}
			class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
		>
			<div class="flex items-center gap-3">
				<span class="text-lg">📝</span>
				<span class="font-medium text-gray-900">Gestión de contenido</span>
			</div>
			<span class="text-gray-400 text-sm">{openSection === 'content' ? '▲' : '▼'}</span>
		</button>

		{#if openSection === 'content'}
			<div class="px-5 pb-6 border-t border-gray-100 space-y-5">
				<div class="pt-4">
					<p class="text-sm text-gray-600">El contenido se organiza en páginas y bloques dentro de cada página.</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Páginas</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li>Cada proyecto tiene páginas (home, servicios, contacto, etc.).</li>
						<li>El <strong>slug</strong> de la página determina su URL: <code class="bg-gray-100 px-1 rounded text-xs">/servicios</code>.</li>
						<li>El slug <code class="bg-gray-100 px-1 rounded text-xs">home</code> corresponde a la raíz <code class="bg-gray-100 px-1 rounded text-xs">/</code>.</li>
						<li><strong>Publicar/archivar:</strong> las páginas archivadas no son visibles en el sitio pero no se eliminan.</li>
					</ul>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Bloques</h3>
					<p class="text-sm text-gray-600">
						Cada página contiene bloques ordenados. Cada bloque tiene un tipo (hero, texto, galería, CTA…)
						y datos en formato JSON. El orden se puede cambiar arrastrando los bloques.
					</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Publicar cambios</h3>
					<p class="text-sm text-gray-600">
						Al guardar un bloque o página, los cambios se almacenan en la base de datos.
						El sitio público siempre sirve el contenido más reciente; no hay un paso de "deploy" manual.
					</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- ── Sección 4: Gestión de assets ── -->
	<section class="bg-white border border-gray-200 rounded-lg overflow-hidden">
		<button
			onclick={() => toggle('assets')}
			class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
		>
			<div class="flex items-center gap-3">
				<span class="text-lg">🖼️</span>
				<span class="font-medium text-gray-900">Gestión de assets</span>
			</div>
			<span class="text-gray-400 text-sm">{openSection === 'assets' ? '▲' : '▼'}</span>
		</button>

		{#if openSection === 'assets'}
			<div class="px-5 pb-6 border-t border-gray-100 space-y-5">
				<div class="pt-4">
					<p class="text-sm text-gray-600">Los assets (imágenes, logos, iconos) se suben al CDN de Cloudflare y se procesan automáticamente.</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Formatos aceptados</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li>JPEG, PNG, WebP, SVG, GIF</li>
						<li>Tamaño máximo por archivo: <strong>10 MB</strong></li>
					</ul>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Variantes generadas</h3>
					<p class="text-sm text-gray-600 mb-2">Por cada imagen subida, el sistema genera automáticamente:</p>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li><strong>original:</strong> el archivo tal como se subió.</li>
						<li><strong>full:</strong> WebP optimizado sin restricción de tamaño.</li>
						<li><strong>cluster:</strong> WebP redimensionado para secciones de contenido (≤ 1200 px).</li>
						<li><strong>thumb:</strong> WebP miniatura para galerías y listas (≤ 400 px).</li>
					</ul>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">CDN y caché</h3>
					<p class="text-sm text-gray-600">
						Las imágenes se sirven desde el CDN de Cloudflare con caché de 30 días en edge.
						Si reemplazas una imagen, puedes purgar la caché desde <strong>Proyecto → Assets → Purgar caché</strong>.
					</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- ── Sección 5: Registro de actividad ── -->
	<section class="bg-white border border-gray-200 rounded-lg overflow-hidden">
		<button
			onclick={() => toggle('audit')}
			class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
		>
			<div class="flex items-center gap-3">
				<span class="text-lg">📋</span>
				<span class="font-medium text-gray-900">Registro de actividad</span>
			</div>
			<span class="text-gray-400 text-sm">{openSection === 'audit' ? '▲' : '▼'}</span>
		</button>

		{#if openSection === 'audit'}
			<div class="px-5 pb-6 border-t border-gray-100 space-y-5">
				<div class="pt-4">
					<p class="text-sm text-gray-600">El audit log registra todas las acciones relevantes realizadas en el panel.</p>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Qué se registra</h3>
					<ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
						<li><strong>assets:</strong> subida, eliminación y purga de caché de imágenes.</li>
						<li><strong>domains:</strong> alta, configuración y desconexión de dominios.</li>
						<li><strong>pages:</strong> creación, edición y publicación de páginas.</li>
						<li><strong>brand:</strong> cambios en la configuración de marca del proyecto.</li>
						<li><strong>settings:</strong> modificaciones en la configuración general del proyecto.</li>
					</ul>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-gray-800 mb-2">Cómo interpretar las entradas</h3>
					<div class="overflow-x-auto">
						<table class="text-xs text-gray-600 w-full border-collapse">
							<thead>
								<tr class="border-b border-gray-200">
									<th class="text-left pb-2 font-medium text-gray-700">Campo</th>
									<th class="text-left pb-2 font-medium text-gray-700">Descripción</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								<tr class="py-1">
									<td class="py-2 pr-4 font-mono">action</td>
									<td class="py-2">Operación realizada (create, update, delete, configure, purge…)</td>
								</tr>
								<tr>
									<td class="py-2 pr-4 font-mono">resource_type</td>
									<td class="py-2">Tipo de recurso afectado (asset, domain, page…)</td>
								</tr>
								<tr>
									<td class="py-2 pr-4 font-mono">actor</td>
									<td class="py-2">Email del usuario que realizó la acción, o "system" para tareas automáticas</td>
								</tr>
								<tr>
									<td class="py-2 pr-4 font-mono">status</td>
									<td class="py-2">success o error</td>
								</tr>
								<tr>
									<td class="py-2 pr-4 font-mono">metadata</td>
									<td class="py-2">Datos adicionales (nombre del archivo, dominio, ID, etc.)</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<div class="bg-gray-50 border border-gray-200 rounded p-3">
					<p class="text-xs text-gray-600">
						El audit log no se puede borrar ni modificar. Sirve de trazabilidad ante incidentes o auditorías.
					</p>
				</div>
			</div>
		{/if}
	</section>

	<p class="text-xs text-gray-400 text-center pb-2">
		¿Tienes alguna duda? Escríbenos a
		<a href="mailto:agencia.jabb@gmail.com" class="underline hover:text-gray-600">agencia.jabb@gmail.com</a>
	</p>
</div>
