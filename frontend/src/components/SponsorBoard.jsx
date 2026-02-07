import { useTopDonorsCurrentRound, useTopDonorsYearly } from '../hooks/useSponsorBoard';
import { formatUSDC, SMALL_POOL, BIG_POOL } from '../hooks/useContract';
import { useContracts } from '../hooks/useContracts';
import { AddressDisplay } from './AddressDisplay';

function DonorList({ donors, emptyMessage }) {
  if (!donors || donors.length === 0) {
    return <p className="no-donors">{emptyMessage}</p>;
  }

  return (
    <div className="donor-list">
      {donors.map((donor, index) => (
        <div key={donor.address} className="donor-item">
          <span className="donor-rank">#{index + 1}</span>
          <span className="donor-address">
            <AddressDisplay address={donor.address} />
          </span>
          <span className="donor-amount nes-text is-success">
            {formatUSDC(donor.amount)} USDC
          </span>
        </div>
      ))}
    </div>
  );
}

function PoolDonorBoard({ poolId, title, maxResults }) {
  const { topDonors, isLoading } = useTopDonorsCurrentRound(poolId, maxResults);

  return (
    <div className="pool-donor-board">
      <h4 className="pool-donor-title">{title}</h4>
      {isLoading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <DonorList
          donors={topDonors}
          emptyMessage="No donations yet this round"
        />
      )}
    </div>
  );
}

function YearlyDonorBoard() {
  const { topDonors, isLoading } = useTopDonorsYearly(3);

  return (
    <div className="yearly-donor-board">
      <h4 className="yearly-donor-title">Top Sponsors (All Time)</h4>
      <p className="yearly-subtitle">365-day rolling window</p>
      {isLoading ? (
        <p className="loading-text">Loading...</p>
      ) : (
        <DonorList
          donors={topDonors}
          emptyMessage="No sponsors yet"
        />
      )}
    </div>
  );
}

export function SponsorBoard() {
  const contracts = useContracts();
  const hasContract = !!contracts.bubblePop;

  if (!hasContract) {
    return null;
  }

  return (
    <section className="sponsor-board">
      <div className="nes-container with-title">
        <p className="title">Sponsor Board</p>

        <div className="sponsor-content">
          {/* Current Round Donors */}
          <div className="current-round-section">
            <h3 className="section-title">Current Round Top Donors</h3>
            <div className="pool-boards">
              <PoolDonorBoard
                poolId={SMALL_POOL}
                title="1 USDC Pool"
                maxResults={10}
              />
              <PoolDonorBoard
                poolId={BIG_POOL}
                title="10 USDC Pool"
                maxResults={10}
              />
            </div>
          </div>

          {/* Yearly Top Sponsors */}
          <div className="yearly-section">
            <YearlyDonorBoard />
          </div>
        </div>

        <p className="sponsor-note">
          Donate to any pool to appear on the sponsor board!
        </p>
      </div>
    </section>
  );
}
