import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs } from '../format.js';
import { Card } from '../components/Card.jsx';
import { CohortTable } from '../components/CohortTable.jsx';
import { Funnel } from '../components/Funnel.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Retention({ force }) {
  const [retention, setRetention] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [champFunnel, setChampFunnel] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.retention;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    Promise.all([
      fetchJson('/stats/retention', { force }),
      fetchJson('/stats/funnel', { force }),
      fetchJson('/stats/champion-funnel', { force }),
    ]).then(([r, f, c]) => {
      setRetention(r);
      setFunnel(f);
      setChampFunnel(c);
      loadedAt.value = { ...loadedAt.value, retention: Date.now() };
    }).catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, retention: 0 }; setErr(null); }} />;
  if (!retention) return <LoadingPane />;

  const medianTTC = champFunnel && champFunnel.medianTimeToChampionMs;

  return (
    <>
      <h2>Cohort Retention (Last 12 Weeks)</h2>
      <div class="panel scroll-x">
        {retention.cohorts && retention.cohorts.length > 0
          ? <CohortTable cohorts={retention.cohorts} />
          : <EmptyState message="No cohort data yet" hint="Needs 12+ weeks of data" />
        }
      </div>

      <h2>Onboarding Funnel (range {range.value})</h2>
      <div class="panel">
        {funnel && funnel.stages && funnel.stages.length > 0
          ? <Funnel stages={funnel.stages} />
          : <EmptyState message="No funnel data" />
        }
      </div>

      <h2>Champion Progression (range {range.value})</h2>
      <div class="panel">
        {champFunnel && champFunnel.stages && champFunnel.stages.length > 0 ? (
          <>
            <Funnel stages={champFunnel.stages} />
            {medianTTC && (
              <div class="grid" style="margin-top:12px">
                <Card label="Median Time to Champion" val={fmtMs(medianTTC)} cls="gold" hint="from first_seen to 20th clear" />
              </div>
            )}
          </>
        ) : <EmptyState message="No champion funnel data" />}
      </div>
    </>
  );
}
