export const mockRepairTasks = [
  {
    id: '1',
    repairTaskNumber: 'RT-2024-001',
    machineName: 'Industrial Printer HP-5000',
    serialNo: 'HP5000-2023-001',
    nameOfIndenter: 'John Smith',
    department: 'Production',
    machinePartName: 'Print Head Assembly',
    problemWithMachine: 'Print quality degradation and missing lines',
    imageOfTheMachine: 'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg',
    enableReminders: true,
    requireAttachment: true,
    taskStartDate: '2024-01-15',
    endingDate: '2024-01-30',
    priority: 'High',
    location: 'Factory Floor A',
    status: 'sent',
    vendorName: 'TechFix Solutions',
    transporterName: 'QuickMove Logistics',
    transportationCharges: 250,
    weighmentSlip: 'WS-2024-001',
    transportingImage: 'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg',
    createdAt: '2024-01-15T08:00:00Z'
  },
  {
    id: '2',
    repairTaskNumber: 'RT-2024-002',
    machineName: 'CNC Milling Machine',
    serialNo: 'CNC-2022-045',
    nameOfIndenter: 'Sarah Johnson',
    department: 'Manufacturing',
    machinePartName: 'Spindle Motor',
    problemWithMachine: 'Unusual vibration and noise during operation',
    imageOfTheMachine: 'https://images.pexels.com/photos/2062426/pexels-photo-2062426.jpeg',
    enableReminders: false,
    requireAttachment: true,
    taskStartDate: '2024-01-20',
    endingDate: '2024-02-05',
    priority: 'Critical',
    location: 'Workshop B',
    status: 'checked',
    vendorName: 'Precision Repairs Ltd',
    transporterName: 'FastTrack Transport',
    transportationCharges: 400,
    weighmentSlip: 'WS-2024-002',
    transportingImage: 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg',
    billImage: 'https://images.pexels.com/photos/6289065/pexels-photo-6289065.jpeg',
    billNo: 'INV-2024-001',
    typeOfBill: 'Service Bill',
    totalBillAmount: 2500,
    paymentType: 'Bank Transfer',
    toBePaidAmount: 2500,
    createdAt: '2024-01-20T09:30:00Z'
  },
  {
    id: '3',
    repairTaskNumber: 'RT-2024-003',
    machineName: 'Conveyor Belt System',
    serialNo: 'CBS-2021-089',
    nameOfIndenter: 'Mike Davis',
    department: 'Logistics',
    machinePartName: 'Motor Drive Unit',
    problemWithMachine: 'Intermittent belt stoppage and speed fluctuation',
    imageOfTheMachine: 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg',
    enableReminders: true,
    requireAttachment: false,
    taskStartDate: '2024-01-25',
    endingDate: '2024-02-10',
    priority: 'Medium',
    location: 'Warehouse C',
    status: 'indent',
    createdAt: '2024-01-25T10:15:00Z'
  }
];

export const mockDashboardMetrics = {
  totalIndents: 15,
  repairsCompleted: 8,
  totalRepairCost: 25600,
  repairStatusByDepartment: [
    { department: 'Production', count: 5 },
    { department: 'Manufacturing', count: 4 },
    { department: 'Logistics', count: 3 },
    { department: 'IT', count: 2 },
    { department: 'Quality', count: 1 }
  ],
  repairTrendOverTime: [
    { month: 'Oct', count: 3 },
    { month: 'Nov', count: 5 },
    { month: 'Dec', count: 7 },
    { month: 'Jan', count: 15 }
  ],
  paymentTypeDistribution: [
    { type: 'Bank Transfer', amount: 15000 },
    { type: 'Cash', amount: 6000 },
    { type: 'Cheque', amount: 4600 }
  ],
  vendorWiseRepairCosts: [
    { vendor: 'TechFix Solutions', cost: 8500 },
    { vendor: 'Precision Repairs Ltd', cost: 7200 },
    { vendor: 'QuickFix Services', cost: 5400 },
    { vendor: 'Industrial Repairs Co', cost: 4500 }
  ]
};


