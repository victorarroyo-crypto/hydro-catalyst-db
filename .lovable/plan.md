
# Plan: Fix ReactFlow Placeholder Detection in All Handlers

## Problema Confirmado
El placeholder `:::reactflow-placeholder-0:::` solo se detecta en el handler `p`. Cuando el LLM genera backticks sueltos (ej: `` `chem 2 CrO₄²⁻ ` ``), ReactMarkdown interpreta el placeholder como **inline code** y lo envía al handler `code`, que NO lo detecta.

## Estado Actual del Código

| Archivo | Handler | Detecta Placeholder? |
|---------|---------|---------------------|
| `AdvisorMessage.tsx` | `p` | ✅ Sí (líneas 248-265) |
| `AdvisorMessage.tsx` | `code` | ❌ No (líneas 309-317) |
| `AdvisorMessage.tsx` | `pre` fallback | ❌ No (líneas 373-382) |
| `StreamingResponse.tsx` | `p` | ✅ Sí (líneas 227-244) |
| `StreamingResponse.tsx` | `code` | ❌ No (líneas 181-198) |
| `StreamingResponse.tsx` | `pre` fallback | ❌ No (líneas 174-179) |

## Cambios Requeridos

### Cambio 1: `AdvisorMessage.tsx` - Handler `code` con detección de placeholder

**Líneas afectadas**: 309-317

**Cambio**: Añadir detección de placeholder ReactFlow antes de la lógica existente.

```typescript
code: ({ children, className }) => {
  const textContent = String(children || '').trim();

  // Check if this inline code is actually a ReactFlow placeholder
  // This happens when stray backticks in LLM output wrap the placeholder
  const reactflowCheck = isReactFlowPlaceholder(textContent);
  if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
    const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
    if (data) {
      return (
        <ReactFlowProvider>
          <ReactFlowDiagram data={data} />
        </ReactFlowProvider>
      );
    }
    console.warn('Invalid ReactFlow JSON in code placeholder');
  }

  // Block code: preserve <code> with className for pre handler
  if (className?.includes('language-')) {
    return <code className={className}>{children}</code>;
  }
  // Inline code
  return <span>{children}</span>;
},
```

### Cambio 2: `AdvisorMessage.tsx` - Handler `pre` fallback con detección

**Líneas afectadas**: 373-382

**Cambio**: Añadir verificación de placeholder antes del return final.

```typescript
// Also check raw pre content for Mermaid (when no code element)
const textContent = extractTextFromChildren(children);
if (isMermaidContent(textContent)) {
  return <MermaidRenderer content={textContent} />;
}

// Check if this pre block contains a ReactFlow placeholder
const reactflowCheck = isReactFlowPlaceholder(textContent.trim());
if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
  const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
  if (data) {
    return (
      <ReactFlowProvider>
        <ReactFlowDiagram data={data} />
      </ReactFlowProvider>
    );
  }
  console.warn('Invalid ReactFlow JSON in pre placeholder');
}

// Regular pre block
return (
  <p className="mb-5 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>
);
```

### Cambio 3: `AdvisorMessage.tsx` - Handler `pre` buscar `code` O `span`

**Líneas afectadas**: 321-324

**Cambio**: Permitir que el handler `pre` detecte tanto `code` como `span` con className.

```typescript
pre: ({ children }) => {
  // Extract the code element (check both 'code' and 'span' since handlers may convert)
  const codeElement = React.Children.toArray(children).find(
    (child): child is React.ReactElement =>
      React.isValidElement(child) && (child.type === 'code' || (child.type === 'span' && child.props?.className?.includes('language-')))
  );
```

### Cambio 4: `StreamingResponse.tsx` - Handler `code` con detección de placeholder

**Líneas afectadas**: 181-198

**Cambio**: Añadir detección de placeholder (mismo patrón que Cambio 1).

```typescript
code: ({ className: codeClassName, children, ...props }: { className?: string; children?: React.ReactNode; node?: any }) => {
  const textContent = String(children || '').trim();

  // Check if this inline code is actually a ReactFlow placeholder
  const reactflowCheck = isReactFlowPlaceholder(textContent);
  if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
    const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
    if (data) {
      return (
        <ReactFlowProvider>
          <ReactFlowDiagram data={data} />
        </ReactFlowProvider>
      );
    }
    console.warn('Invalid ReactFlow JSON in code placeholder');
  }

  // Check if this is an inline code (no className usually means inline)
  const isInline = !codeClassName && !props.node?.position;
  
  if (isInline) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
        {children}
      </code>
    );
  }
  
  // Block code (will be wrapped by pre)
  return (
    <code className={cn('font-mono', codeClassName)} {...props}>
      {children}
    </code>
  );
},
```

### Cambio 5: `StreamingResponse.tsx` - Handler `pre` fallback con detección

**Líneas afectadas**: 174-179

**Cambio**: Añadir verificación de placeholder antes del return final.

```typescript
// Check if this pre block contains a ReactFlow placeholder
const textContent = extractTextFromChildren(children);

// Check for ReactFlow placeholder in pre fallback
const reactflowCheck = isReactFlowPlaceholder(textContent.trim());
if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
  const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
  if (data) {
    return (
      <ReactFlowProvider>
        <ReactFlowDiagram data={data} />
      </ReactFlowProvider>
    );
  }
  console.warn('Invalid ReactFlow JSON in pre placeholder');
}

// Default pre styling
return (
  <pre className="bg-card text-card-foreground p-4 rounded-lg overflow-x-auto my-4 text-sm">
    {children}
  </pre>
);
```

### Cambio 6: `StreamingResponse.tsx` - Handler `pre` buscar `code` O `span`

**Líneas afectadas**: 131-134

**Cambio**: Permitir detección de span con className.

```typescript
pre: ({ children }: { children?: React.ReactNode }) => {
  // Extract the code element (check both 'code' and 'span')
  const codeElement = React.Children.toArray(children).find(
    (child): child is React.ReactElement => 
      React.isValidElement(child) && (child.type === 'code' || (child.type === 'span' && child.props?.className?.includes('language-')))
  );
```

### Cambio 7: `StreamingResponse.tsx` - Añadir helper `extractTextFromChildren`

El archivo `StreamingResponse.tsx` no tiene este helper que sí existe en `AdvisorMessage.tsx`. Necesitamos añadirlo o crear una versión local.

```typescript
// Helper function to extract text from React children (needed for pre fallback)
const extractTextFromChildren = (children: React.ReactNode): string => {
  const extractText = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (React.isValidElement(node) && node.props?.children) {
      return React.Children.toArray(node.props.children).map(extractText).join('');
    }
    return '';
  };
  return React.Children.toArray(children).map(extractText).join('').trim();
};
```

## Resumen de Archivos

| Archivo | Cambios |
|---------|---------|
| `src/components/advisor/AdvisorMessage.tsx` | Handler `code` + `pre` fallback + búsqueda `code/span` |
| `src/components/advisor/streaming/StreamingResponse.tsx` | Handler `code` + `pre` fallback + búsqueda `code/span` + helper |

## Flujo Corregido

```text
LLM genera: `chem CrO₄²⁻` :::reactflow-placeholder-0:::

ReactMarkdown interpreta placeholder como inline code
              ↓
         Handler `code`
              ↓
  isReactFlowPlaceholder(":::reactflow-placeholder-0:::") 
              ↓
        { isPlaceholder: true, index: 0 }
              ↓
    parseReactFlowJSON(reactflowBlocksRef.current[0])
              ↓
        ReactFlowDiagram renderiza ✓
```

## Verificación Post-Implementación

1. El placeholder `:::reactflow-placeholder-N:::` NUNCA debe aparecer como texto visible
2. Los diagramas deben renderizarse como gráficos interactivos incluso cuando hay backticks sueltos en el contenido previo
3. Los bloques ` ```reactflow ``` ` normales deben seguir funcionando
4. El código inline normal debe seguir renderizándose sin styling especial
