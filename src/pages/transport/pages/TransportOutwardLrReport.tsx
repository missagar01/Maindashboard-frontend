import TransportLrBiltyTypePage from "./TransportLrBiltyTypePage";

export default function TransportOutwardLrReport() {
  return (
    <TransportLrBiltyTypePage
      loadingOrderType="OUTWARD"
      title="Outward LR Report"
      accentColor="bg-indigo-500"
      accentText="text-indigo-600"
    />
  );
}
