import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetFreightSummary,
  apiGetFreightContracts,
  apiCreateFreightContract,
  apiCalculateFreight,
  FreightSummaryKPI,
  FreightContractItem,
  FreightCalculationResult
} from '../../lib/api';
import {
  ArrowLeft,
  Truck,
  Calculator,
  Plus,
  Layers,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  Scale,
  Compass,
  Zap,
  Sliders
} from 'lucide-react';

const FALLBACK_SUMMARY: FreightSummaryKPI = {
  total_freight_spend: 8570.0,
  admin_funded_spend: 8570.0,
  total_recoveries: 500.0,
  total_subsidies: 8070.0,
  net_logistics_margin: -8070.0,
  active_contracts_count: 2,
  cost_events_count: 3,
  pending_reconciliations: 1,
  currency: 'INR'
};

const FALLBACK_CONTRACTS: FreightContractItem[] = [
  {
    id: 'fc-01',
    contract_number: 'FC-2026-VTR-01',
    transporter_name: 'V-Trans Logistics India Ltd.',
    vehicle_class: '32FT_CONTAINER',
    status: 'ACTIVE',
    priority: 1,
    notes: 'Interstate primary linehaul contract with tiered weight slabs.',
    effective_from: '2026-01-01T00:00:00Z',
    lanes: [
      {
        id: 'lane-01',
        origin_zone: 'Jaipur Central Logistics Hub',
        destination_zone: 'Delhi South Distribution Center',
        distance_km: 260.0,
        distance_source: 'CONTRACTED',
        transit_days: 1,
        priority: 1
      },
      {
        id: 'lane-02',
        origin_zone: 'Jaipur Central Logistics Hub',
        destination_zone: 'Chandigarh Distribution Depot',
        distance_km: 490.0,
        distance_source: 'CONTRACTED',
        transit_days: 2,
        priority: 1
      }
    ],
    rate_rules: [
      {
        id: 'rr-01',
        charge_basis: 'SLAB',
        base_rate: 6.5,
        min_charge: 500.0,
        slab_config: [
          { min_kg: 0, max_kg: 500, rate: 7.0 },
          { min_kg: 501, max_kg: 1500, rate: 6.5 },
          { min_kg: 1501, max_kg: 99999, rate: 5.8 }
        ],
        rounding_rule: 'NEAREST_1'
      }
    ],
    ancillary_rules: [
      { id: 'anc-01', ancillary_type: 'LOADING', charge_basis: 'FLAT', rate: 300.0, is_mandatory: true, condition_text: 'Terminal loading charge' },
      { id: 'anc-02', ancillary_type: 'TOLL', charge_basis: 'ACTUAL', rate: 450.0, is_mandatory: false, condition_text: 'Fastag toll reimbursement' },
      { id: 'anc-03', ancillary_type: 'HAMALI', charge_basis: 'PER_PACKAGE', rate: 15.0, is_mandatory: false, condition_text: 'Labor per carton' }
    ]
  },
  {
    id: 'fc-02',
    contract_number: 'FC-2026-GATI-02',
    transporter_name: 'Gati KWE Express Cargo',
    vehicle_class: '14FT_TRUCK',
    status: 'ACTIVE',
    priority: 2,
    notes: 'Express courier and time-critical medical supplies contract.',
    effective_from: '2026-01-01T00:00:00Z',
    lanes: [
      {
        id: 'lane-03',
        origin_zone: 'Jaipur Central Logistics Hub',
        destination_zone: 'Gurugram Healthcare Depot',
        distance_km: 230.0,
        distance_source: 'GOOGLE_MAPS',
        transit_days: 1,
        priority: 1
      }
    ],
    rate_rules: [
      {
        id: 'rr-02',
        charge_basis: 'PER_KG',
        base_rate: 8.5,
        min_charge: 450.0,
        rounding_rule: 'NEAREST_1'
      }
    ],
    ancillary_rules: [
      { id: 'anc-04', ancillary_type: 'INSURANCE', charge_basis: 'PERCENTAGE', rate: 0.5, is_mandatory: true, condition_text: '0.5% cargo transit cover' },
      { id: 'anc-05', ancillary_type: 'DETENTION', charge_basis: 'FLAT', rate: 500.0, is_mandatory: false, condition_text: 'Demurrage beyond 4 hours' }
    ]
  }
];

export const FreightRateMaster: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'SANDBOX'>('CONTRACTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<FreightSummaryKPI>(FALLBACK_SUMMARY);
  const [contracts, setContracts] = useState<FreightContractItem[]>(FALLBACK_CONTRACTS);

  // Sandbox inputs
  const [selectedTransporter, setSelectedTransporter] = useState<string>('V-Trans Logistics India Ltd.');
  const [weightKg, setWeightKg] = useState<number>(35.0);
  const [volumetricCbm, setVolumetricCbm] = useState<number>(0.18);
  const [pkgCount, setPkgCount] = useState<number>(3);
  const [distanceKm, setDistanceKm] = useState<number>(260.0);
  const [declaredValue, setDeclaredValue] = useState<number>(45000.0);
  const [recoveryMode, setRecoveryMode] = useState<string>('SUBSIDY');
  const [recoveryAmt, setRecoveryAmt] = useState<number>(0.0);
  const [includedAncillaries, setIncludedAncillaries] = useState<string[]>(['LOADING', 'TOLL']);
  const [calcResult, setCalcResult] = useState<FreightCalculationResult | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // New Contract Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newTransporterName, setNewTransporterName] = useState<string>('');
  const [newVehicleClass, setNewVehicleClass] = useState<string>('32FT_CONTAINER');
  const [newChargeBasis, setNewChargeBasis] = useState<string>('PER_KG');
  const [newBaseRate, setNewBaseRate] = useState<number>(7.0);
  const [newMinCharge, setNewMinCharge] = useState<number>(500.0);
  const [newLaneOrigin, setNewLaneOrigin] = useState<string>('Jaipur Central Logistics Hub');
  const [newLaneDest, setNewLaneDest] = useState<string>('Delhi South Distribution Center');
  const [newLaneDist, setNewLaneDist] = useState<number>(260.0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, conRes] = await Promise.all([
        apiGetFreightSummary().catch(() => ({ success: false, summary: FALLBACK_SUMMARY })),
        apiGetFreightContracts().catch(() => ({ success: false, contracts: FALLBACK_CONTRACTS }))
      ]);

      if (sumRes && sumRes.summary) {
        setSummary(sumRes.summary);
      }
      if (conRes && Array.isArray(conRes.contracts) && conRes.contracts.length > 0) {
        setContracts(conRes.contracts);
      }
    } catch {
      setSummary(FALLBACK_SUMMARY);
      setContracts(FALLBACK_CONTRACTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else {
          navigate('/cargo');
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsModalOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab(prev => prev === 'CONTRACTS' ? 'SANDBOX' : 'CONTRACTS');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, navigate]);

  // Execute Sandbox Calculation
  const handleCalculate = async () => {
    try {
      setCalcLoading(true);
      const volWeight = volumetricCbm * 167.0; // standard IATA air/courier volumetric factor (1 CBM = 167 kg)
      const res = await apiCalculateFreight({
        transporter_name: selectedTransporter,
        origin_zone: 'Jaipur Central Logistics Hub',
        destination_zone: 'Delhi South Distribution Center',
        gross_weight_kg: weightKg,
        volumetric_weight_kg: volWeight,
        package_count: pkgCount,
        distance_km: distanceKm,
        declared_value: declaredValue,
        ancillaries_requested: includedAncillaries,
        recovery_type: recoveryMode,
        recovery_amount: recoveryAmt
      });

      if (res && res.calculation) {
        setCalcResult(res.calculation);
      }
    } catch {
      // Deterministic client fallback calculation
      const base = Math.max(weightKg * 6.5, 500.0);
      const loading = includedAncillaries.includes('LOADING') ? 300.0 : 0.0;
      const toll = includedAncillaries.includes('TOLL') ? 450.0 : 0.0;
      const hamali = includedAncillaries.includes('HAMALI') ? pkgCount * 15.0 : 0.0;
      const total = Math.round(base + loading + toll + hamali);
      const rec = recoveryMode === 'FULL_PASS_THROUGH' ? total : (recoveryAmt || 0);

      setCalcResult({
        contract_id: 'local-calc',
        contract_number: 'FC-2026-VTR-01',
        transporter_name: selectedTransporter,
        chargeable_weight_kg: weightKg,
        base_freight: base,
        ancillary_charges: [
          { type: 'LOADING', basis: 'FLAT', rate: 300, amount: loading },
          { type: 'TOLL', basis: 'ACTUAL', rate: 450, amount: toll }
        ],
        total_ancillary: loading + toll + hamali,
        gross_freight_cost: total,
        recovery_type: recoveryMode,
        recovery_amount: rec,
        subsidy_amount: Math.max(total - rec, 0),
        logistics_margin: rec - total,
        formula_text: `${weightKg}kg x Rs 6.50 + Loading (Rs ${loading}) + Toll (Rs ${toll}) = Gross Rs ${total}`,
        is_admin_funded: true,
        cost_bearer: 'Admin Company (Platform)',
        beneficiary: 'Client Company',
        currency: 'INR'
      });
    } finally {
      setCalcLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateFreightContract({
        transporter_name: newTransporterName,
        vehicle_class: newVehicleClass,
        priority: 1,
        lanes: [
          {
            origin_zone: newLaneOrigin,
            destination_zone: newLaneDest,
            distance_km: newLaneDist,
            distance_source: 'CONTRACTED',
            transit_days: 1
          }
        ],
        rate_rules: [
          {
            charge_basis: newChargeBasis,
            base_rate: newBaseRate,
            min_charge: newMinCharge
          }
        ],
        ancillary_rules: [
          { ancillary_type: 'LOADING', charge_basis: 'FLAT', rate: 300.0, is_mandatory: true },
          { ancillary_type: 'TOLL', charge_basis: 'ACTUAL', rate: 450.0, is_mandatory: false }
        ]
      });
      setIsModalOpen(false);
      fetchData();
    } catch {
      // Local fallback append
      const newC: FreightContractItem = {
        id: `fc-local-${Date.now()}`,
        contract_number: `FC-2026-${newTransporterName.substring(0, 3).toUpperCase()}-01`,
        transporter_name: newTransporterName,
        vehicle_class: newVehicleClass,
        status: 'ACTIVE',
        priority: 1,
        lanes: [
          {
            id: 'lane-new',
            origin_zone: newLaneOrigin,
            destination_zone: newLaneDest,
            distance_km: newLaneDist,
            distance_source: 'CONTRACTED',
            transit_days: 1,
            priority: 1
          }
        ],
        rate_rules: [
          {
            id: 'rr-new',
            charge_basis: newChargeBasis,
            base_rate: newBaseRate,
            min_charge: newMinCharge,
            rounding_rule: 'NEAREST_1'
          }
        ],
        ancillary_rules: [
          { id: 'anc-new', ancillary_type: 'LOADING', charge_basis: 'FLAT', rate: 300.0, is_mandatory: true }
        ]
      };
      setContracts(prev => [newC, ...prev]);
      setIsModalOpen(false);
    }
  };

  const toggleAncillary = (type: string) => {
    setIncludedAncillaries(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-800 font-sans pb-12">
      {/* Top Breadcrumb & Hotkey Bar */}
      <div className="bg-[#1b4332] text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/cargo')}
            className="p-1 hover:bg-[#2d6a4f] rounded text-white flex items-center transition-colors"
            title="Return to Cargo Board [Esc]"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-xs uppercase font-semibold">Cargo Board [Esc]</span>
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-300" />
            <h1 className="text-lg font-bold tracking-wide">
              DOC-35 Freight & Logistics Cost Recovery Engine
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            id="btn-switch-tab-contracts"
            onClick={() => setActiveTab('CONTRACTS')}
            className={`px-3 py-1.5 rounded font-semibold transition-all ${
              activeTab === 'CONTRACTS' ? 'bg-emerald-500 text-white shadow' : 'bg-[#2d6a4f] hover:bg-emerald-700 text-gray-200'
            }`}
          >
            Rate Contracts Catalog
          </button>
          <button
            id="btn-switch-tab-sandbox"
            onClick={() => setActiveTab('SANDBOX')}
            className={`px-3 py-1.5 rounded font-semibold transition-all ${
              activeTab === 'SANDBOX' ? 'bg-emerald-500 text-white shadow' : 'bg-[#2d6a4f] hover:bg-emerald-700 text-gray-200'
            }`}
          >
            Calculation Sandbox [F4]
          </button>
          <button
            onClick={() => navigate('/freight/reconciliation')}
            className="px-3 py-1.5 rounded font-semibold bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-600 transition-all"
          >
            Reconciliation Desk
          </button>
          <button
            id="btn-new-contract"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded font-bold bg-amber-500 hover:bg-amber-600 text-gray-950 flex items-center shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Contract [F6]
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div id="kpi-active-contracts" className="bg-white border-l-4 border-emerald-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Active Rate Cards</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-gray-900 mt-2">
              {summary.active_contracts_count} Contracts
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1">
              Tiered weight slabs & lane priorities
            </div>
          </div>

          <div id="kpi-freight-spend" className="bg-white border-l-4 border-blue-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Admin Freight Spend</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900 mt-2">
              ₹{summary.admin_funded_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-blue-700 font-medium mt-1">
              100% Platform Admin Funded (A/C 5200)
            </div>
          </div>

          <div id="kpi-total-recoveries" className="bg-white border-l-4 border-teal-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Customer Recoveries</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-teal-900 mt-2">
              ₹{summary.total_recoveries.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-teal-700 font-medium mt-1">
              Subsidized: ₹{summary.total_subsidies.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div id="kpi-logistics-margin" className="bg-white border-l-4 border-purple-600 p-4 rounded shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
              <span>Net Logistics Margin</span>
              <TrendingDown className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900 mt-2">
              ₹{summary.net_logistics_margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-purple-700 font-medium mt-1">
              Reconciled: {summary.cost_events_count} dispatches
            </div>
          </div>
        </div>

        {/* Tab 1: Contracts & Rate Cards */}
        {activeTab === 'CONTRACTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-emerald-700" />
                  Transporter Rate Contracts & Lane Matrices
                </h2>
                <p className="text-xs text-gray-500">
                  Versioned rate cards, origin-destination distance rules, and ancillary surcharge definitions.
                </p>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-emerald-800 hover:text-emerald-950 flex items-center font-semibold bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contracts.map(contract => (
                <div
                  key={contract.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="bg-[#1b4332] text-white px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-base tracking-wide">{contract.transporter_name}</span>
                        <span className="bg-emerald-500 text-gray-950 font-black text-[10px] px-2 py-0.5 rounded">
                          {contract.contract_number}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-200 mt-0.5">
                        Vehicle: {contract.vehicle_class} | Priority: Tier {contract.priority}
                      </div>
                    </div>
                    <span className="bg-emerald-800 text-emerald-200 text-xs px-2.5 py-1 rounded font-semibold border border-emerald-600">
                      {contract.status}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Lanes */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <Compass className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Configured Lanes ({contract.lanes?.length || 0})
                      </h4>
                      <div className="space-y-1.5">
                        {contract.lanes?.map(lane => (
                          <div
                            key={lane.id}
                            className="bg-gray-50 p-2.5 rounded border border-gray-100 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-gray-800">{lane.origin_zone}</span>
                              <span className="mx-1 text-gray-400">&rarr;</span>
                              <span className="font-semibold text-gray-800">{lane.destination_zone}</span>
                            </div>
                            <div className="text-gray-500 font-medium">
                              {lane.distance_km} km ({lane.distance_source}) &bull; {lane.transit_days}d SLA
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rate Rules */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <Scale className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Rate Basis & Slabs
                      </h4>
                      {contract.rate_rules?.map(rr => (
                        <div key={rr.id} className="bg-emerald-50/60 p-3 rounded border border-emerald-100 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-900">
                              Basis: {rr.charge_basis} &bull; Base Rate: ₹{rr.base_rate.toFixed(2)}/kg
                            </span>
                            <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded font-semibold">
                              Min: ₹{rr.min_charge.toFixed(2)}
                            </span>
                          </div>

                          {rr.slab_config && rr.slab_config.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              {rr.slab_config.map((s, idx) => (
                                <div key={idx} className="bg-white p-1.5 rounded border border-emerald-200 text-center">
                                  <div className="text-[10px] text-gray-500">{s.min_kg} - {s.max_kg > 50000 ? '∞' : s.max_kg} kg</div>
                                  <div className="text-xs font-bold text-emerald-800">₹{s.rate.toFixed(2)}/kg</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Ancillary Surcharges */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                        <Zap className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Ancillary Surcharges ({contract.ancillary_rules?.length || 0})
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {contract.ancillary_rules?.map(anc => (
                          <div key={anc.id} className="bg-amber-50/50 p-2 rounded border border-amber-200/60">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900">{anc.ancillary_type}</span>
                              <span className="text-amber-800 font-semibold">
                                {anc.charge_basis === 'PERCENTAGE' ? `${anc.rate}%` : `₹${anc.rate.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate" title={anc.condition_text}>
                              {anc.is_mandatory ? 'Mandatory' : 'Optional'} &bull; {anc.condition_text || anc.charge_basis}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Calculation Simulator & Sandbox */}
        {activeTab === 'SANDBOX' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Input Form */}
            <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-5">
              <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center">
                    <Sliders className="w-5 h-5 mr-2 text-emerald-700" />
                    Shipment Parameters & Rate Sandbox
                  </h3>
                  <p className="text-xs text-gray-500">
                    Test deterministic freight calculations and simulate customer recovery margins.
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded font-bold">
                  Live Engine
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Contract / Transporter</label>
                  <select
                    value={selectedTransporter}
                    onChange={e => setSelectedTransporter(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {contracts.map(c => (
                      <option key={c.id} value={c.transporter_name}>
                        {c.transporter_name} ({c.contract_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Lane Route</label>
                  <input
                    type="text"
                    disabled
                    value="Jaipur Central -> Delhi South (260 km)"
                    className="w-full bg-gray-100 border border-gray-300 rounded p-2 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Gross Weight (kg)</label>
                  <input
                    id="input-test-weight"
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={e => setWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Package Count</label>
                  <input
                    id="input-test-packages"
                    type="number"
                    value={pkgCount}
                    onChange={e => setPkgCount(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Distance (km)</label>
                  <input
                    id="input-test-distance"
                    type="number"
                    value={distanceKm}
                    onChange={e => setDistanceKm(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Declared Value (₹)</label>
                  <input
                    type="number"
                    value={declaredValue}
                    onChange={e => setDeclaredValue(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ancillary Surcharges Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                  Select Applicable Ancillaries
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'LOADING', label: 'Loading Terminal (₹300)', mandatory: true },
                    { type: 'TOLL', label: 'Toll Reimbursement (₹450)' },
                    { type: 'HAMALI', label: 'Hamali Labor (₹15/pkg)' },
                    { type: 'INSURANCE', label: 'Transit Cover (0.5%)' },
                    { type: 'DETENTION', label: 'Demurrage (₹500)' }
                  ].map(anc => (
                    <button
                      type="button"
                      key={anc.type}
                      onClick={() => toggleAncillary(anc.type)}
                      className={`px-3 py-2 text-xs font-semibold rounded border text-left transition-all flex items-center justify-between ${
                        includedAncillaries.includes(anc.type)
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold'
                          : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{anc.label}</span>
                      {includedAncillaries.includes(anc.type) && (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-700 ml-1 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recovery Mode */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Commercial Recovery Policy
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Recovery Type</label>
                    <select
                      value={recoveryMode}
                      onChange={e => setRecoveryMode(e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 bg-white"
                    >
                      <option value="SUBSIDY">100% Platform Admin Subsidized (No Recovery)</option>
                      <option value="FULL_PASS_THROUGH">Full Pass-Through to Customer</option>
                      <option value="RATE_BASED">Fixed Customer Charge (Rate-Based)</option>
                    </select>
                  </div>

                  {recoveryMode === 'RATE_BASED' && (
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Customer Recovery Amount (₹)</label>
                      <input
                        type="number"
                        value={recoveryAmt}
                        onChange={e => setRecoveryAmt(parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded p-2 bg-white font-bold text-emerald-800"
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                id="btn-execute-calc"
                onClick={handleCalculate}
                disabled={calcLoading}
                className="w-full py-3 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold text-sm rounded shadow flex items-center justify-center space-x-2 transition-all"
              >
                <Calculator className="w-4 h-4 text-emerald-300" />
                <span>{calcLoading ? 'Calculating Rate Rules...' : 'Execute Deterministic Freight Calculation'}</span>
              </button>
            </div>

            {/* Right Column: Output Card */}
            <div className="lg:col-span-5 space-y-4">
              <div id="card-calc-result" className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-emerald-700" />
                    Calculation Breakdown Snapshot
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded">
                    DOC-35 Explainability
                  </span>
                </div>

                {calcResult ? (
                  <div className="space-y-4 text-xs">
                    {/* Primary Output */}
                    <div className="bg-[#1b4332] text-white p-4 rounded-lg space-y-2">
                      <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">
                        Gross Transporter Cost
                      </div>
                      <div className="text-3xl font-black text-white">
                        ₹{calcResult.gross_freight_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-emerald-200 font-medium">
                        Cost Bearer: <span className="text-amber-300 font-bold">{calcResult.cost_bearer}</span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Base Freight ({calcResult.chargeable_weight_kg} kg):</span>
                        <span className="font-bold text-gray-900">₹{calcResult.base_freight.toFixed(2)}</span>
                      </div>
                      {calcResult.ancillary_charges.map((anc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-gray-600 pl-2">
                          <span>+ {anc.type} ({anc.basis}):</span>
                          <span className="font-semibold text-gray-800">₹{anc.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-gray-600 pt-1 border-t border-gray-100 font-bold">
                        <span>Total Ancillary Surcharges:</span>
                        <span className="text-gray-900">₹{calcResult.total_ancillary.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Margin & Recovery */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1.5">
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Customer Recovery:</span>
                        <span className="font-bold text-emerald-700">₹{calcResult.recovery_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Platform Admin Subsidy:</span>
                        <span className="font-bold text-blue-700">₹{calcResult.subsidy_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200 font-black text-sm">
                        <span>Net Logistics Margin:</span>
                        <span className={calcResult.logistics_margin < 0 ? 'text-purple-800' : 'text-emerald-800'}>
                          ₹{calcResult.logistics_margin.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Formula Explanation */}
                    <div className="p-3 bg-emerald-50/60 rounded border border-emerald-200 text-emerald-950 font-mono text-[11px] leading-relaxed">
                      <div className="font-sans font-bold text-emerald-900 mb-1">Auditable Formula Trace:</div>
                      {calcResult.formula_text}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    <Calculator className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Adjust parameters on the left and click Execute to view the step-by-step freight rate breakdown.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Contract Modal */}
      {isModalOpen && (
        <div id="modal-new-contract" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden border border-gray-200">
            <div className="bg-[#1b4332] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center">
                <Plus className="w-5 h-5 mr-2 text-amber-400" />
                Register New Freight Rate Contract
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Transporter Name</label>
                <input
                  type="text"
                  required
                  value={newTransporterName}
                  onChange={e => setNewTransporterName(e.target.value)}
                  placeholder="e.g. Blue Dart Express Cargo"
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Vehicle Class</label>
                  <select
                    value={newVehicleClass}
                    onChange={e => setNewVehicleClass(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 bg-white"
                  >
                    <option value="14FT_TRUCK">14 Ft Truck</option>
                    <option value="32FT_CONTAINER">32 Ft Container</option>
                    <option value="TRAILER">Trailer / Heavy Haul</option>
                    <option value="ANY">Any / Express Parcel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Charge Basis</label>
                  <select
                    value={newChargeBasis}
                    onChange={e => setNewChargeBasis(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 bg-white"
                  >
                    <option value="PER_KG">Per KG (Standard)</option>
                    <option value="FLAT">Flat Trip Rate</option>
                    <option value="PER_PACKAGE">Per Package / Carton</option>
                    <option value="PER_KM">Per KM Distance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Base Rate (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newBaseRate}
                    onChange={e => setNewBaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Minimum Charge (₹)</label>
                  <input
                    type="number"
                    required
                    value={newMinCharge}
                    onChange={e => setNewMinCharge(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded p-2 font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <label className="block text-gray-700 font-semibold mb-1">Primary Route Lane</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newLaneOrigin}
                    onChange={e => setNewLaneOrigin(e.target.value)}
                    placeholder="Origin Hub"
                    className="border border-gray-300 rounded p-1.5"
                  />
                  <input
                    type="text"
                    value={newLaneDest}
                    onChange={e => setNewLaneDest(e.target.value)}
                    placeholder="Destination Hub"
                    className="border border-gray-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-semibold hover:bg-gray-100"
                >
                  Cancel [Esc]
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold rounded shadow"
                >
                  Create Contract [Enter]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
