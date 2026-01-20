import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { ProjectBriefing } from '@/types/briefing';

interface Props {
  briefing: ProjectBriefing;
  onChange: (briefing: ProjectBriefing) => void;
}

export function CompanyInfoSection({ briefing, onChange }: Props) {
  const updateCompanyInfo = (field: string, value: string) => {
    onChange({
      ...briefing,
      company_info: {
        ...briefing.company_info,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Información de la Empresa</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Estos datos ayudarán a los agentes a investigar información relevante sobre la empresa
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">Nombre de la empresa *</Label>
          <Input
            id="company_name"
            placeholder="Ej: Industrias Acme S.L."
            value={briefing.company_info.company_name}
            onChange={(e) => updateCompanyInfo('company_name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_website">Sitio web</Label>
          <Input
            id="company_website"
            placeholder="https://www.empresa.com"
            value={briefing.company_info.company_website || ''}
            onChange={(e) => updateCompanyInfo('company_website', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nif_cif">NIF/CIF</Label>
          <Input
            id="nif_cif"
            placeholder="B12345678"
            value={briefing.company_info.nif_cif || ''}
            onChange={(e) => updateCompanyInfo('nif_cif', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnae_code">Código CNAE</Label>
          <Input
            id="cnae_code"
            placeholder="1071"
            value={briefing.company_info.cnae_code || ''}
            onChange={(e) => updateCompanyInfo('cnae_code', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plant_location">Ubicación de la planta</Label>
          <Input
            id="plant_location"
            placeholder="Ciudad, Provincia"
            value={briefing.company_info.plant_location || ''}
            onChange={(e) => updateCompanyInfo('plant_location', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="autonomous_community">Comunidad Autónoma</Label>
          <Input
            id="autonomous_community"
            placeholder="Ej: Cataluña"
            value={briefing.company_info.autonomous_community || ''}
            onChange={(e) => updateCompanyInfo('autonomous_community', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="river_basin">Cuenca Hidrográfica</Label>
          <Input
            id="river_basin"
            placeholder="Ej: Ebro"
            value={briefing.company_info.river_basin || ''}
            onChange={(e) => updateCompanyInfo('river_basin', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industrial_sector">Sector Industrial</Label>
          <Input
            id="industrial_sector"
            placeholder="Ej: Alimentario, Textil, Químico..."
            value={briefing.company_info.industrial_sector || ''}
            onChange={(e) => updateCompanyInfo('industrial_sector', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
