<script lang="ts">
  import { untrack }  from 'svelte';
  import { enhance }  from '$app/forms';
  import { toast }    from '$lib/toast.svelte';
  import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
  import { schemaToFields }        from '$lib/blocks/schemaToFields';
  import ArrayObjectEditor         from '$lib/components/ArrayObjectEditor.svelte';
  import type { PageData }     from './$types';
  import type { ActionResult } from '@sveltejs/kit';

  let { data }: { data: PageData } = $props();

  const entry  = ADMIN_BLOCK_REGISTRY['header']!;
  const fields = schemaToFields(entry.schema);

  let currentProps = $state<Record<string, unknown>>(
    untrack(() => JSON.parse(JSON.stringify((data.project.header_props as Record<string, unknown>) ?? {})) as Record<string, unknown>),
  );
  let saving = $state(false);
  let propsJson = $derived(JSON.stringify(currentProps));

  function updateProp(key: string, value: unknown) {
    currentProps = { ...currentProps, [key]: value };
  }

  function getPropValue(key: string): unknown {
    return key in currentProps ? currentProps[key] : (fields.find(f => f.key === key)?.defaultValue ?? null);
  }
</script>

<svelte:head><title>Encabezado — {data.project.name}</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
    <a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
    <span>/</span>
    <a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
    <span>/</span>
    <a href="/projects/{data.project.id}/template" class="hover:text-gray-900">Plantilla</a>
    <span>/</span>
    <span class="text-gray-900 font-medium">Encabezado</span>
  </div>

  <h1 class="text-xl font-semibold text-gray-900">Encabezado del sitio</h1>

  <form
    method="POST"
    action="?/save"
    use:enhance={() => {
      saving = true;
      return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
        await update({ reset: false });
        saving = false;
        if (result.type === 'success') toast('success', 'Encabezado guardado.');
        else if (result.type === 'failure') toast('error', (result.data as Record<string, string>)?.error ?? 'Error al guardar.');
      };
    }}
    class="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
  >
    <input type="hidden" name="props" value={propsJson} />

    {#each fields as field (field.key)}
      {@const val     = getPropValue(field.key)}
      {@const inputId = `header-${field.key}`}
      <div>
        <label for={inputId} class="block text-sm font-medium text-gray-700 mb-1">
          {field.key}{field.required ? ' *' : ''}
        </label>

        {#if field.inputType === 'array-objects'}
          <ArrayObjectEditor
            {field}
            value={(val ?? []) as Record<string, unknown>[]}
            onUpdate={(items: Record<string, unknown>[]) => updateProp(field.key, items)}
          />
        {:else if field.inputType === 'array-strings'}
          <textarea
            id={inputId}
            rows="3"
            value={(val as string[] ?? []).join('\n')}
            oninput={(e) => updateProp(field.key, (e.target as HTMLTextAreaElement).value.split('\n').filter(s => s.trim()))}
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder="Un elemento por línea"
          ></textarea>
        {:else if field.inputType === 'select'}
          <select
            id={inputId}
            value={String(val ?? field.options?.[0] ?? '')}
            onchange={(e) => updateProp(field.key, (e.target as HTMLSelectElement).value)}
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {#each field.options ?? [] as opt (opt)}<option value={opt}>{opt}</option>{/each}
          </select>
        {:else if field.inputType === 'checkbox'}
          <input id={inputId} type="checkbox" checked={Boolean(val ?? false)} onchange={(e) => updateProp(field.key, (e.target as HTMLInputElement).checked)} class="w-4 h-4" />
        {:else if field.inputType === 'number'}
          <input id={inputId} type="number" value={Number(val ?? 0)} oninput={(e) => updateProp(field.key, Number((e.target as HTMLInputElement).value))} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        {:else if field.inputType === 'textarea'}
          <textarea id={inputId} rows="4" value={String(val ?? '')} oninput={(e) => updateProp(field.key, (e.target as HTMLTextAreaElement).value)} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"></textarea>
        {:else if field.inputType === 'json'}
          <textarea id={inputId} rows="4" value={JSON.stringify(val ?? {}, null, 2)} oninput={(e) => { try { updateProp(field.key, JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* JSON inválido — ignorar */ } }} class="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono resize-y"></textarea>
        {:else}
          <input id={inputId} type="text" value={String(val ?? '')} oninput={(e) => updateProp(field.key, (e.target as HTMLInputElement).value)} class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        {/if}
      </div>
    {/each}

    <div class="flex justify-end pt-2 border-t border-gray-100">
      <button type="submit" disabled={saving} class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors">
        {saving ? 'Guardando…' : 'Guardar encabezado'}
      </button>
    </div>
  </form>
</div>
