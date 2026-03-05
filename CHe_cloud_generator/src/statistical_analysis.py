"""
FAIR Score Analysis Script
- Correlation between FAIR score and Triples (with normality test)
- ANOVA test between organisation type and FAIR score

Usage:
    python fair_analysis.py <path_to_tsv_file>
    python fair_analysis.py data.tsv
"""

import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from scipy import stats
from scipy.stats import shapiro, pearsonr, spearmanr, kruskal
import warnings
warnings.filterwarnings('ignore')

tsv_path = '../data/fairness_evaluation/CHe-CLOUD-datasets-GLAM-tagged.tsv'
df = pd.read_csv(tsv_path, sep='\t')

df.columns = df.columns.str.strip()

# Validate required columns
required_cols = ['Organization', 'Triples', 'FAIR score']
missing = [c for c in required_cols if c not in df.columns]
if missing:
    print(f"Error: missing columns: {missing}")
    print(f"Available columns: {list(df.columns)}")
    sys.exit(1)

# Clean up
df['Triples'] = pd.to_numeric(df['Triples'], errors='coerce').fillna(0)
df['FAIR score'] = pd.to_numeric(df['FAIR score'], errors='coerce')
df = df.dropna(subset=['FAIR score'])

print(f"Loaded {len(df)} rows from '{tsv_path}'")

# Extract first organisation type (handle empty/NaN/multi-value)
df['Org_primary'] = (
    df['Organization']
    .fillna('Unknown')
    .str.strip()
    .str.split(r'[,/]')
    .str[0]
    .str.strip()
    .replace('', 'Unknown')
)

# ── 2. Correlation: FAIR score vs Triples ─────────────────────────────────────

print("\n" + "=" * 65)
print("PART 1 — CORRELATION: FAIR Score vs Triples")
print("=" * 65)

fair        = df['FAIR score'].values
triples     = df['Triples'].values
log_triples = np.log1p(triples)   # log(1+x) — zero-safe log transform

# Normality tests (Shapiro-Wilk)
stat_f, p_f = shapiro(fair)
stat_t, p_t = shapiro(log_triples)

print(f"\nShapiro-Wilk — FAIR score:       W={stat_f:.4f}, p={p_f:.4f}")
print(f"Shapiro-Wilk — log(Triples+1):  W={stat_t:.4f}, p={p_t:.4f}")
alpha = 0.05

fair_normal   = p_f > alpha
triple_normal = p_t > alpha
print(f"\nNormality (α={alpha}):  FAIR={fair_normal}, Triples={triple_normal}")

if fair_normal and triple_normal:
    method = "Pearson"
    r, p_corr = pearsonr(fair, log_triples)
else:
    method = "Spearman"
    r, p_corr = spearmanr(fair, log_triples)

print(f"\n→ Using {method} correlation (on log-transformed Triples)")
print(f"  r = {r:.4f},  p = {p_corr:.4f}")
sig = "significant" if p_corr < alpha else "NOT significant"
print(f"  Result: {sig} at α={alpha}")

# ── 3. ANOVA / Kruskal-Wallis: Org type vs FAIR score ────────────────────────

print("\n" + "=" * 65)
print("PART 2 — GROUP TEST: Organisation Type vs FAIR Score")
print("=" * 65)

# Drop groups with fewer than 3 observations
counts     = df['Org_primary'].value_counts()
valid_orgs = counts[counts >= 3].index
df_anova   = df[df['Org_primary'].isin(valid_orgs)].copy()

groups = [g['FAIR score'].values for _, g in df_anova.groupby('Org_primary')]

print(f"\nGroups included (≥3 obs): {sorted(df_anova['Org_primary'].unique())}")
print("\nGroup statistics:")
print(df_anova.groupby('Org_primary')['FAIR score']
      .agg(['count', 'mean', 'median', 'std']).round(3).to_string())

# Normality per group
print("\nShapiro-Wilk per group:")
group_normal = True
for name, grp in df_anova.groupby('Org_primary'):
    vals = grp['FAIR score'].values
    if len(vals) >= 3:
        sw, sw_p = shapiro(vals)
        ok = sw_p > alpha
        if not ok:
            group_normal = False
        print(f"  {name:12s}: W={sw:.4f}, p={sw_p:.4f}  → {'normal' if ok else 'NOT normal'}")

if group_normal:
    test_name  = "One-way ANOVA"
    stat_label = "F"
    stat, p_anova = stats.f_oneway(*groups)
else:
    test_name  = "Kruskal-Wallis"
    stat_label = "H"
    stat, p_anova = kruskal(*groups)

print(f"\n→ Using {test_name}")
print(f"  {stat_label} = {stat:.4f},  p = {p_anova:.4f}")
sig2 = "significant" if p_anova < alpha else "NOT significant"
print(f"  Result: {sig2} at α={alpha}")

if p_anova < alpha:
    from itertools import combinations
    from scipy.stats import mannwhitneyu
    print("\nPost-hoc pairwise Mann-Whitney U (Bonferroni correction):")
    pairs   = list(combinations(sorted(df_anova['Org_primary'].unique()), 2))
    n_pairs = len(pairs)
    results = []
    for a, b in pairs:
        ga = df_anova[df_anova['Org_primary'] == a]['FAIR score'].values
        gb = df_anova[df_anova['Org_primary'] == b]['FAIR score'].values
        u, pu = mannwhitneyu(ga, gb, alternative='two-sided')
        pu_bonf = min(pu * n_pairs, 1.0)
        results.append((a, b, u, pu, pu_bonf))
    for a, b, u, pu, pu_bonf in sorted(results, key=lambda x: x[4]):
        flag = "**" if pu_bonf < alpha else ""
        print(f"  {a} vs {b}: U={u:.0f}, p={pu:.4f}, p_bonf={pu_bonf:.4f} {flag}")

# ── 4. Visualisation ──────────────────────────────────────────────────────────

fig = plt.figure(figsize=(16, 12))
gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.42, wspace=0.35)

# 4a. Scatter: FAIR vs log(Triples)
ax1 = fig.add_subplot(gs[0, 0])
colors_map = {org: plt.cm.tab10(i) for i, org in enumerate(df['Org_primary'].unique())}
for org, grp in df.groupby('Org_primary'):
    ax1.scatter(np.log1p(grp['Triples']), grp['FAIR score'],
                alpha=0.65, s=35, label=org, color=colors_map[org])
m, b_lin = np.polyfit(log_triples, fair, 1)
xs = np.linspace(log_triples.min(), log_triples.max(), 200)
ax1.plot(xs, m * xs + b_lin, 'k--', lw=1.4, label='trend')
ax1.set_xlabel('log(Triples + 1)', fontsize=10)
ax1.set_ylabel('FAIR Score', fontsize=10)
ax1.set_title(
    f'FAIR Score vs log(Triples)\n{method}: r={r:.3f}, p={p_corr:.3f}',
    fontsize=10)
ax1.legend(fontsize=6, ncol=2, loc='upper left')

# 4b. Q-Q plot for FAIR Score
ax2 = fig.add_subplot(gs[0, 1])
stats.probplot(fair, dist="norm", plot=ax2)
ax2.set_title('Q-Q Plot — FAIR Score', fontsize=10)

# 4c. Boxplot by org type
ax3 = fig.add_subplot(gs[1, :])
org_order = (df_anova.groupby('Org_primary')['FAIR score']
             .median().sort_values(ascending=False).index.tolist())
data_box  = [df_anova[df_anova['Org_primary'] == o]['FAIR score'].values for o in org_order]
bp = ax3.boxplot(data_box, patch_artist=True, notch=False, vert=True)
palette = plt.cm.Set2(np.linspace(0, 1, len(org_order)))
for patch, col in zip(bp['boxes'], palette):
    patch.set_facecolor(col)
ax3.set_xticks(range(1, len(org_order) + 1))
ax3.set_xticklabels(org_order, rotation=20, ha='right', fontsize=9)
ax3.set_ylabel('FAIR Score', fontsize=10)
ax3.set_title(
    f'FAIR Score by Organisation Type\n'
    f'{test_name}: {stat_label}={stat:.3f}, p={p_anova:.4f}',
    fontsize=10)
ax3.grid(axis='y', alpha=0.3)

plt.suptitle('FAIR Score Analysis — Cultural Heritage Linked Open Data',
             fontsize=13, fontweight='bold', y=1.01)

# Save plot in the same directory as the input file
import os
out_dir  = os.path.dirname(os.path.abspath(tsv_path))
out_path = os.path.join(out_dir, 'fair_analysis.png')
plt.savefig(out_path, dpi=150, bbox_inches='tight')
plt.close()
print(f"\nPlot saved → {out_path}")
print("\nScript complete.")