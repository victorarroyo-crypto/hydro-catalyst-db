

## Fix: Document extraction polling scoped to current audit

### Problem
When you upload a document to the Proquimia contract and request extraction, the polling logic checks ALL project documents. Since Brenntag already has extracted data (`supplier_name` exists), the polling immediately detects "structured data found" and stops -- before Proquimia's document has actually been processed. The document appears to never get extracted.

### Root Cause
The `startPolling` function (line 225) queries `chem_contract_documents` filtered only by `project_id`. It considers polling complete when ANY document in the project has `datos_extraidos.supplier_name`. Since Brenntag's documents already have this, polling stops instantly for any other contract.

### Solution
Scope the polling to the current audit's documents only, using `audit_id` instead of `project_id`.

### Changes in `src/pages/chemicals/ChemContratos.tsx`

**1. Fix `startPolling` (lines 225-240)**

Change the polling query from:
```js
.eq('project_id', projectId!)
```
To:
```js
.eq('audit_id', selectedAudit!)
```

And track which specific document IDs lacked structured data BEFORE extraction started, then check if those specific documents now have it:

```js
const startPolling = useCallback((docIds?: string[]) => {
  if (pollingRef.current) clearInterval(pollingRef.current);
  pollingRef.current = setInterval(async () => {
    const query = externalSupabase
      .from('chem_contract_documents')
      .select('id, datos_extraidos, confianza_extraccion, estado_extraccion')
      .eq('audit_id', selectedAudit!);
    
    const { data } = await query;
    
    // Check if targeted docs (or any audit doc) now have structured data
    const targetDocs = docIds 
      ? data?.filter((d: any) => docIds.includes(d.id))
      : data;
    const hasStructured = targetDocs?.some((d: any) => d.datos_extraidos?.supplier_name);
    
    if (hasStructured) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      queryClient.invalidateQueries({ queryKey: ['chem-contract-docs', projectId, selectedAudit] });
      toast.success('Extraccion completada');
    }
  }, 5000);
  setTimeout(() => { if (pollingRef.current) clearInterval(pollingRef.current); }, 180000);
}, [projectId, selectedAudit, queryClient]);
```

**2. Fix `handleExtractSingleDoc` (line 257)**

Pass the specific `docId` to `startPolling` so it only watches that document:
```js
startPolling([docId]);
```

**3. Fix `handleExtractContracts` (line 242)**

Collect the IDs of documents that don't yet have structured data, pass them to `startPolling`:
```js
const pendingDocIds = documents
  .filter((d: any) => !d.datos_extraidos?.supplier_name)
  .map((d: any) => d.id);
startPolling(pendingDocIds);
```

### Why this fixes it
- Polling now only checks the current audit's documents, not the whole project
- It specifically tracks which documents were pending extraction and waits for THOSE to complete
- Brenntag's already-extracted data no longer triggers a false "completed" signal

### Files to modify
- `src/pages/chemicals/ChemContratos.tsx` -- 3 small changes to `startPolling`, `handleExtractContracts`, and `handleExtractSingleDoc`
