import { useMemo } from "react";
import { formatPrice } from "../../utils/storefront";

function PosRecentSales({ sales, returnDrafts, onDraftChange, onSubmitReturn }) {
  const sortedSales = useMemo(() => sales.slice(0, 10), [sales]);

  return (
    <section className="panel-card pos-sales-panel">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Recent sales</span>
          <h2>POS sales and returns</h2>
        </div>
      </div>

      <div className="list-stack">
        {sortedSales.length ? sortedSales.map((sale) => (
          <article key={sale.id} className="pos-sale-card">
            <div className="list-row list-row-top">
              <div>
                <strong>{sale.saleNumber}</strong>
                <p>{sale.customerName}</p>
                <small>{new Date(sale.saleDate).toLocaleString()}</small>
              </div>
              <div className="admin-order-controls">
                <span className="status-pill">{sale.status.replaceAll("_", " ")}</span>
                <strong>{formatPrice(sale.totalAmount)}</strong>
              </div>
            </div>

            <div className="list-stack compact-return-grid">
              {(sale.items || []).map((item) => {
                const remaining = Math.max(item.quantity - item.quantityReturned, 0);

                return (
                  <div key={item.id} className="return-item-row">
                    <div>
                      <strong>{item.name}</strong>
                      <div className="pos-return-stats">
                        <span>Sold: {item.quantity}</span>
                        <span>Returned: {item.quantityReturned}</span>
                        <span>Returnable: {remaining}</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      placeholder="0"
                      value={returnDrafts[`${sale.id}-${item.id}`] || ""}
                      onChange={(event) => onDraftChange(sale.id, item.id, event.target.value)}
                      disabled={remaining <= 0}
                    />
                  </div>
                );
              })}
            </div>

            <button type="button" className="secondary-button" onClick={() => onSubmitReturn(sale)}>
              Process return
            </button>
          </article>
        )) : (
          <p>No POS sales yet.</p>
        )}
      </div>
    </section>
  );
}

export default PosRecentSales;
