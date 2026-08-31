/* Small icon/label/value tile — replaces the near-identical component
   redefined locally in HotelDetail/TourDetail/BusDetail as FactTile/
   InfoTile/DetailTile. */
function DetailTile({ icon: Icon, label, value }) {
  return (
    <div className="glass-surface rounded-card p-3.5 text-center">
      {Icon && <Icon className="mx-auto h-5 w-5 text-accent" />}
      <p className="mt-1.5 truncate font-display text-[13px] font-bold text-content">{value}</p>
      <p className="mt-0.5 text-[10.5px] text-content-muted">{label}</p>
    </div>
  );
}

export default DetailTile;
