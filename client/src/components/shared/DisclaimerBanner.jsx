export default function DisclaimerBanner() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#0F1B2D',
        color: '#ffffff',
        fontSize: '12px',
        lineHeight: '1.4',
        padding: '10px 16px',
        textAlign: 'center',
      }}
    >
      PRELIMINARY ASSESSMENT ONLY — This tool produces a structured compliance
      assessment against EU AI Act deployer obligations. It is not legal advice.
      All findings require qualified legal review before being relied upon for
      compliance purposes. Verbatim citations are sourced from Regulation (EU)
      2024/1689, Official Journal of the European Union, 12.7.2024.
    </div>
  );
}
