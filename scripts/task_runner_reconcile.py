#!/usr/bin/env python3
import csv
import json
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

TASK_DIR = Path('/home/node/task')
OUT_DIR = TASK_DIR / 'out'
LOG_DIR = OUT_DIR / 'logs'
VENV_PY = TASK_DIR / '.venv_runner' / 'bin' / 'python'
REPORT_PATH = OUT_DIR / 'runner_position_check_report.json'

RUN_TIMEOUT_SEC = 420
MAX_LOG_CHARS = 2800


@dataclass
class RunnerTarget:
    symbol: str
    runner: Path
    csv_path: Path
    state_json: Path
    log_path: Path


TARGETS: List[RunnerTarget] = [
    RunnerTarget(
        symbol='BTC',
        runner=TASK_DIR / 'runner_BTC_v20_step1_strength_gate_fixwash_default7_paritytail.py',
        csv_path=OUT_DIR / 'runner_trades_btc_v18_modular.csv',
        state_json=OUT_DIR / 'trade_state_btc.json',
        log_path=LOG_DIR / 'btc_usdt.log',
    ),
    RunnerTarget(
        symbol='DOGE',
        runner=TASK_DIR / 'runner_DOGE_v2_deep_modular_hardMikiri_shield_paritytail.py',
        csv_path=OUT_DIR / 'runner_trades_doge_dynmult.csv',
        state_json=OUT_DIR / 'trade_state_doge.json',
        log_path=LOG_DIR / 'doge_usdt.log',
    ),
    RunnerTarget(
        symbol='ETH',
        runner=TASK_DIR / 'runner_ETH_v2_deep_modular_FIXED_paritytail_h1assistTTL.py',
        csv_path=OUT_DIR / 'runner_trades_eth_dynmult.csv',
        state_json=OUT_DIR / 'trade_state_eth.json',
        log_path=LOG_DIR / 'eth_usdt.log',
    ),
    RunnerTarget(
        symbol='SOL',
        runner=TASK_DIR / 'runner_SOL_v2_deep_modular_FIXED_paritytail_h1assistTTL.py',
        csv_path=OUT_DIR / 'runner_trades_sol_dynmult.csv',
        state_json=OUT_DIR / 'trade_state_sol.json',
        log_path=LOG_DIR / 'sol_usdt.log',
    ),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_runner(target: RunnerTarget) -> Tuple[bool, str]:
    if not VENV_PY.exists():
        return False, f'python env missing: {VENV_PY}'
    if not target.runner.exists():
        return False, f'runner script missing: {target.runner}'

    cmd = [str(VENV_PY), str(target.runner)]
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(TASK_DIR),
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SEC,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return False, f'runner timeout ({RUN_TIMEOUT_SEC}s): {target.runner.name}'
    except Exception as e:
        return False, f'runner launch error: {e}'

    out = (proc.stdout or '') + '\n' + (proc.stderr or '')
    tail = '\n'.join([ln for ln in out.splitlines() if ln.strip()][-20:])

    if proc.returncode != 0:
        return False, f'runner exit code {proc.returncode}\n{tail}'
    return True, tail


def parse_state(state_path: Path) -> Dict:
    if not state_path.exists():
        return {"ok": False, "error": f"state json missing: {state_path}"}
    try:
        data = json.loads(state_path.read_text(encoding='utf-8'))
    except Exception as e:
        return {"ok": False, "error": f"state json parse error: {e}"}

    if not isinstance(data, dict) or not data:
        return {"ok": False, "error": "state json empty/invalid"}

    symbol = next(iter(data.keys()))
    rec = data[symbol]
    if not isinstance(rec, dict):
        return {"ok": False, "error": "state record invalid"}

    status = str(rec.get('status', '')).upper().strip()
    qty_raw = rec.get('current_qty', 0)
    try:
        qty = float(qty_raw or 0)
    except Exception:
        qty = 0.0

    holding = qty > 0 or status in {'ACTIVE', 'IN_POSITION', 'HOLDING'}
    return {
        "ok": True,
        "symbol": symbol,
        "status": status,
        "qty": qty,
        "holding": holding,
    }


def parse_runner_csv(csv_path: Path) -> Dict:
    if not csv_path.exists():
        return {"ok": False, "error": f"runner csv missing: {csv_path}"}
    try:
        with csv_path.open(newline='', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
    except Exception as e:
        return {"ok": False, "error": f"csv parse error: {e}"}

    if not rows:
        return {"ok": False, "error": "runner csv has no rows"}

    last = rows[-1]
    exit_time = str(last.get('exit_time', '') or '').strip()
    holding = exit_time == '' or exit_time.lower() in {'none', 'null', 'nan'}

    return {
        "ok": True,
        "rows": len(rows),
        "last_trade_id": str(last.get('trade_id', '') or ''),
        "last_entry_time": str(last.get('entry_time', '') or ''),
        "last_exit_time": exit_time,
        "holding": holding,
    }


def log_snippet(log_path: Path) -> str:
    if not log_path.exists():
        return f'(log missing: {log_path})'
    try:
        lines = log_path.read_text(encoding='utf-8', errors='ignore').splitlines()
    except Exception as e:
        return f'(log read error: {e})'

    tail = lines[-200:]
    important = [
        ln for ln in tail
        if re.search(r'(error|exception|fail|failed|traceback|warning|⚠️|❌)', ln, re.IGNORECASE)
    ]
    selected = important[-12:] if important else tail[-12:]
    text = '\n'.join(selected).strip()
    if len(text) > MAX_LOG_CHARS:
        text = text[-MAX_LOG_CHARS:]
    return text or '(empty log tail)'


def build_telegram_text(report: Dict) -> str:
    lines: List[str] = []
    lines.append('⚠️ Runner 持倉對帳異常')
    lines.append(f"UTC: {report.get('generatedAt')}")
    lines.append('')

    for a in report.get('anomalies', []):
        sym = a.get('symbol', 'UNKNOWN')
        kind = a.get('kind', 'unknown')
        msg = a.get('message', '')
        lines.append(f"• {sym} | {kind}")
        if msg:
            lines.append(f"  {msg}")
    lines.append('')

    # include concise per-symbol status
    for item in report.get('symbols', []):
        sym = item.get('symbol')
        state_h = item.get('state', {}).get('holding')
        csv_h = item.get('csv', {}).get('holding')
        lines.append(f"{sym}: JSON={state_h} / CSV={csv_h}")

    # attach analyzable log snippets
    lines.append('')
    lines.append('📎 OUT/LOG 可分析片段：')
    for item in report.get('symbols', []):
        if item.get('anomaly'):
            lines.append(f"[{item.get('symbol')}]")
            snippet = item.get('logSnippet', '')
            if snippet:
                lines.append(snippet)
                lines.append('---')

    text = '\n'.join(lines).strip()
    if len(text) > 3900:
        text = text[:3900] + '\n...(truncated)'
    return text


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    report: Dict = {
        "generatedAt": now_iso(),
        "taskDir": str(TASK_DIR),
        "symbols": [],
        "anomalies": [],
        "anomalyCount": 0,
    }

    for t in TARGETS:
        sym_report: Dict = {"symbol": t.symbol, "runner": t.runner.name}

        ok, runner_tail = run_runner(t)
        sym_report['runnerOk'] = ok
        sym_report['runnerTail'] = runner_tail

        state = parse_state(t.state_json)
        csv_info = parse_runner_csv(t.csv_path)
        sym_report['state'] = state
        sym_report['csv'] = csv_info

        anomaly = False
        if not ok:
            anomaly = True
            report['anomalies'].append({
                "symbol": t.symbol,
                "kind": "runner_failed",
                "message": runner_tail[:600],
            })

        if not state.get('ok'):
            anomaly = True
            report['anomalies'].append({
                "symbol": t.symbol,
                "kind": "state_invalid",
                "message": state.get('error', ''),
            })

        if not csv_info.get('ok'):
            anomaly = True
            report['anomalies'].append({
                "symbol": t.symbol,
                "kind": "csv_invalid",
                "message": csv_info.get('error', ''),
            })

        if state.get('ok') and csv_info.get('ok'):
            state_h = bool(state.get('holding'))
            csv_h = bool(csv_info.get('holding'))
            if state_h != csv_h:
                anomaly = True
                report['anomalies'].append({
                    "symbol": t.symbol,
                    "kind": "holding_mismatch",
                    "message": f"JSON holding={state_h}, CSV holding={csv_h}",
                })

        sym_report['anomaly'] = anomaly
        sym_report['logSnippet'] = log_snippet(t.log_path) if anomaly else ''
        report['symbols'].append(sym_report)

    report['anomalyCount'] = len(report['anomalies'])
    report['telegramText'] = build_telegram_text(report) if report['anomalyCount'] > 0 else ''

    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    print(f"report_path={REPORT_PATH}")
    print(f"anomaly_count={report['anomalyCount']}")
    if report['anomalyCount'] > 0:
        print('status=anomaly')
    else:
        print('status=ok')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
