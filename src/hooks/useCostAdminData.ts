/**
 * Cost Consulting Admin Hooks
 * React Query hooks for suppliers and benchmarks management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Supplier, 
  SupplierFilters, 
  SupplierCreateData, 
  SupplierVerifyData,
  BenchmarkPrice, 
  BenchmarkFilters, 
  BenchmarkCreateData 
} from '@/types/costConsulting';
import { toast } from 'sonner';

const RAILWAY_URL = 'https://watertech-scouting-production.up.railway.app';

// ============================================================
// SUPPLIERS API FUNCTIONS
// ============================================================

const fetchSuppliers = async (filters: SupplierFilters = {}): Promise<Supplier[]> => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.categoria) params.append('categoria', filters.categoria);
  if (filters.vertical_code) params.append('vertical_code', filters.vertical_code);
  if (filters.verified !== 'all' && filters.verified !== undefined) {
    params.append('verified', String(filters.verified));
  }
  if (filters.activo !== 'all' && filters.activo !== undefined) {
    params.append('activo', String(filters.activo));
  }
  if (filters.region) params.append('region', filters.region);

  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/suppliers?${params.toString()}`
  );
  if (!response.ok) throw new Error('Error fetching suppliers');
  const data = await response.json();
  return data.suppliers || data || [];
};

const fetchPendingSuppliers = async (): Promise<Supplier[]> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/suppliers/pending`);
  if (!response.ok) throw new Error('Error fetching pending suppliers');
  const data = await response.json();
  return data.suppliers || data || [];
};

const fetchSupplierById = async (id: string): Promise<Supplier> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/suppliers/${id}`);
  if (!response.ok) throw new Error('Error fetching supplier');
  return response.json();
};

const createSupplierApi = async (data: SupplierCreateData): Promise<Supplier> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error creating supplier');
  return response.json();
};

const updateSupplierApi = async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/suppliers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error updating supplier');
  return response.json();
};

const verifySupplierApi = async (id: string, data: SupplierVerifyData): Promise<Supplier> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/suppliers/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error verifying supplier');
  return response.json();
};

const deleteSupplierApi = async (id: string): Promise<void> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/suppliers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error deleting supplier');
};

// ============================================================
// BENCHMARKS API FUNCTIONS
// ============================================================

const fetchBenchmarks = async (filters: BenchmarkFilters = {}): Promise<BenchmarkPrice[]> => {
  const params = new URLSearchParams();
  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.region) params.append('region', filters.region);
  if (filters.year) params.append('year', String(filters.year));
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(
    `${RAILWAY_URL}/api/cost-consulting/benchmarks/prices?${params.toString()}`
  );
  if (!response.ok) throw new Error('Error fetching benchmarks');
  const data = await response.json();
  return data.benchmarks || data || [];
};

const fetchBenchmarkById = async (id: string): Promise<BenchmarkPrice> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/benchmarks/prices/${id}`);
  if (!response.ok) throw new Error('Error fetching benchmark');
  return response.json();
};

const createBenchmarkApi = async (data: BenchmarkCreateData): Promise<BenchmarkPrice> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/benchmarks/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error creating benchmark');
  return response.json();
};

const updateBenchmarkApi = async (id: string, data: Partial<BenchmarkCreateData>): Promise<BenchmarkPrice> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/benchmarks/prices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error updating benchmark');
  return response.json();
};

const deleteBenchmarkApi = async (id: string): Promise<void> => {
  const response = await fetch(`${RAILWAY_URL}/api/cost-consulting/benchmarks/prices/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error deleting benchmark');
};

// ============================================================
// SUPPLIERS HOOKS
// ============================================================

export const useCostAdminSuppliers = (filters: SupplierFilters = {}) => {
  return useQuery({
    queryKey: ['cost-admin-suppliers', filters],
    queryFn: () => fetchSuppliers(filters),
    staleTime: 1000 * 60 * 2,
  });
};

export const useCostPendingSuppliers = () => {
  return useQuery({
    queryKey: ['cost-pending-suppliers'],
    queryFn: fetchPendingSuppliers,
    staleTime: 1000 * 60 * 2,
  });
};

export const useCostSupplier = (id: string | null) => {
  return useQuery({
    queryKey: ['cost-supplier', id],
    queryFn: () => fetchSupplierById(id!),
    enabled: !!id,
  });
};

export const useSupplierMutations = () => {
  const queryClient = useQueryClient();

  const createSupplier = useMutation({
    mutationFn: createSupplierApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-admin-suppliers'] });
      toast.success('Proveedor creado correctamente');
    },
    onError: () => {
      toast.error('Error al crear el proveedor');
    },
  });

  const updateSupplier = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      updateSupplierApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-admin-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-supplier'] });
      toast.success('Proveedor actualizado correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar el proveedor');
    },
  });

  const verifySupplier = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierVerifyData }) =>
      verifySupplierApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-admin-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-pending-suppliers'] });
      toast.success('Proveedor verificado correctamente');
    },
    onError: () => {
      toast.error('Error al verificar el proveedor');
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: deleteSupplierApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-admin-suppliers'] });
      toast.success('Proveedor eliminado correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar el proveedor');
    },
  });

  return { createSupplier, updateSupplier, verifySupplier, deleteSupplier };
};

// ============================================================
// BENCHMARKS HOOKS
// ============================================================

export const useCostBenchmarks = (filters: BenchmarkFilters = {}) => {
  return useQuery({
    queryKey: ['cost-benchmarks', filters],
    queryFn: () => fetchBenchmarks(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCostBenchmark = (id: string | null) => {
  return useQuery({
    queryKey: ['cost-benchmark', id],
    queryFn: () => fetchBenchmarkById(id!),
    enabled: !!id,
  });
};

export const useBenchmarkMutations = () => {
  const queryClient = useQueryClient();

  const createBenchmark = useMutation({
    mutationFn: createBenchmarkApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-benchmarks'] });
      toast.success('Benchmark creado correctamente');
    },
    onError: () => {
      toast.error('Error al crear el benchmark');
    },
  });

  const updateBenchmark = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BenchmarkCreateData> }) =>
      updateBenchmarkApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-benchmarks'] });
      queryClient.invalidateQueries({ queryKey: ['cost-benchmark'] });
      toast.success('Benchmark actualizado correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar el benchmark');
    },
  });

  const deleteBenchmark = useMutation({
    mutationFn: deleteBenchmarkApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-benchmarks'] });
      toast.success('Benchmark eliminado correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar el benchmark');
    },
  });

  return { createBenchmark, updateBenchmark, deleteBenchmark };
};
