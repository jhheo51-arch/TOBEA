"""관측 기록만 재계산한다. 미래 출전·부상·승률을 예측하지 않는다."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
data = json.loads((root / 'observed-data.json').read_text(encoding='utf-8'))
results = []
for row in data['rows']:
    assert 0 <= row['HR'] <= row['H'] <= row['AB'] <= row['PA']
    assert row['TB'] >= row['H'] + 3 * row['HR']
    assert abs(row['TB'] / row['AB'] - row['SLG']) <= 0.0005
    results.append({
        'player': row['player'], 'year': row['year'],
        'AVG_calculated': row['H'] / row['AB'],
        'SLG_calculated': row['TB'] / row['AB'],
        'OPS_from_published_rounded_rates': row['OBP'] + row['SLG'],
        'HR_per_100_PA': 100 * row['HR'] / row['PA'],
        'BB_per_100_PA': 100 * row['BB'] / row['PA'],
        'observed_PA_per_appearance': row['PA'] / row['G'],
    })
a, b, c = results
output = {
    'scope': data['scope'], 'rows': results,
    'gu_2026_minus_2024': {
        'OBP_points': data['rows'][1]['OBP'] - data['rows'][0]['OBP'],
        'SLG_points': data['rows'][1]['SLG'] - data['rows'][0]['SLG'],
        'OPS_points': b['OPS_from_published_rounded_rates'] - a['OPS_from_published_rounded_rates'],
    },
    'gu_minus_kim_2026': {
        'OBP_percentage_points': 100 * (data['rows'][1]['OBP'] - data['rows'][2]['OBP']),
        'OPS_points': b['OPS_from_published_rounded_rates'] - c['OPS_from_published_rounded_rates'],
        'warning': 'Descriptive gap only; not causal runs lost or a future projection.',
    },
}
print(json.dumps(output, ensure_ascii=False, indent=2))
