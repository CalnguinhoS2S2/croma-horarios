"""QA de integração. Execute com Playwright disponível e o servidor local ativo."""
import csv
import io
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'qa-artifacts'
ARTIFACTS.mkdir(exist_ok=True)
URL = os.environ.get('CROMA_QA_URL', 'http://127.0.0.1:8080')
CHROME = os.environ.get('CROMA_CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
CUSTOM = '\ufeffaluno;disciplina;nome\r\n0001;MAT;Matemática\r\n0001;FIS;Física\r\n0002;MAT;Matemática\r\n0002;QUI;Química\r\n0003;FIS;Física\r\n0003;QUI;Química\r\n0004;HIS;História\r\n0004;HIS;História\r\n'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    response = page.goto(URL)
    assert response.status == 200
    expect(page.locator('#stat-students')).to_have_text('26')
    expect(page.locator('#stat-courses')).to_have_text('8')
    expect(page.locator('.course-card')).to_have_count(8)
    page.screenshot(path=str(ARTIFACTS / 'desktop.png'), full_page=True)

    # Equivalência com o executável C++ real, quando disponível no Windows.
    executable = ROOT.parent / 'output' / 'coloracaoHARD.exe'
    if executable.exists():
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory(prefix='croma-reference-') as temporary:
            reference = subprocess.run([str(executable), str(ROOT.parent / 'matriculas_exemplo.csv')], cwd=temporary, text=True, capture_output=True, check=True)
            original = list(csv.DictReader((Path(temporary) / 'cronograma_cpp.csv').read_text().splitlines()))
            slots = page.locator('.slot').evaluate_all("slots => Object.fromEntries(slots.flatMap((slot, i) => [...slot.querySelectorAll('.course-code')].map(node => [node.textContent, 'H' + (i + 1)])))")
            assert slots == {row['sigla']: row['horario'] for row in original}, (slots, original)
        print('OK: horários idênticos aos do executável coloracaoHARD.cpp')

    page.locator('#tab-grafo').click()
    expect(page.locator('.graph-node')).to_have_count(8)
    page.locator('.graph-node').first.click()
    expect(page.locator('#graph-detail')).not_to_contain_text('Selecione uma disciplina')
    assert page.locator('.graph-edge.highlight').count() > 0
    page.screenshot(path=str(ARTIFACTS / 'grafo.png'), full_page=True)

    page.locator('#file-input').set_input_files({'name': 'minhas_matriculas.csv', 'mimeType': 'text/csv', 'buffer': CUSTOM.encode('utf-8')})
    expect(page.locator('#stat-students')).to_have_text('4')
    expect(page.locator('#stat-courses')).to_have_text('4')
    expect(page.locator('#export-button')).to_be_disabled()
    expect(page.locator('#file-detail')).to_contain_text('1 duplicadas ignoradas')
    page.locator('#generate-button').click()
    expect(page.locator('#stat-slots')).to_have_text('3')
    expect(page.locator('#stat-conflicts')).to_have_text('0')
    expect(page.locator('.course-card')).to_have_count(4)
    page.locator('#time-button').click()
    page.locator('#start-time').fill('09:00')
    page.locator('#duration').fill('50')
    page.locator('#break-time').fill('10')
    page.locator('#time-form button[type=submit]').click()
    expect(page.locator('.slot-time').first).to_have_text('09:00 – 09:50')
    expect(page.locator('.slot-time').nth(1)).to_have_text('10:00 – 10:50')
    with page.expect_download() as download_info:
        page.locator('#export-button').click()
    exported = ARTIFACTS / 'cronograma_teste.csv'
    download_info.value.save_as(exported)
    raw = exported.read_bytes()
    assert raw.startswith(b'\xef\xbb\xbf')
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    assert len(rows) == 4
    schedule = {row['sigla']: row['horario'] for row in rows}
    assert len({schedule['MAT'], schedule['FIS'], schedule['QUI']}) == 3
    assert schedule['HIS'] in {schedule['MAT'], schedule['FIS'], schedule['QUI']}

    page.locator('#tab-matriculas').click()
    page.locator('#enrollment-search').fill('0001')
    expect(page.locator('#enrollment-body tr')).to_have_count(2)
    page.locator('#enrollment-search').fill('nao-existe')
    expect(page.locator('#enrollment-body')).to_contain_text('Nenhuma matrícula')
    page.locator('#enrollment-search').fill('')
    expect(page.locator('#enrollment-body tr')).to_have_count(7)

    page.locator('#file-input').set_input_files({'name': 'invalido.csv', 'mimeType': 'text/csv', 'buffer': b'aluno,disciplina\nA,'})
    expect(page.locator('#error-message')).to_be_visible()
    expect(page.locator('#error-message')).to_contain_text('Linha 2')
    expect(page.locator('#stat-slots')).to_have_text('3')
    expect(page.locator('#export-button')).to_be_enabled()

    # Valores importados são texto: não viram elementos HTML executáveis.
    page.locator('#file-input').set_input_files({'name': 'texto.csv', 'mimeType': 'text/csv', 'buffer': b'aluno,disciplina,nome\nA,X,<img src=x onerror=window.pwned=true>'})
    page.locator('#generate-button').click()
    expect(page.locator('.course-name')).to_have_text('<img src=x onerror=window.pwned=true>')
    assert page.evaluate('window.pwned === undefined')
    assert page.locator('.course-name img').count() == 0

    page.locator('#example-button').click()
    expect(page.locator('#stat-students')).to_have_text('26')
    expect(page.locator('.course-card')).to_have_count(8)
    page.locator('#format-button').click()
    expect(page.locator('#help-dialog')).to_be_visible()
    page.locator('#dialog-done').click()
    page.locator('#how-button').click()
    expect(page.locator('#help-content')).to_contain_text('heurística')
    page.keyboard.press('Escape')
    page.locator('#clear-times').click()
    page.screenshot(path=str(ARTIFACTS / 'desktop.png'), full_page=True)

    # Touch, navegação e ausência de rolagem horizontal em celular.
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'overflow horizontal em celular'
    page.screenshot(path=str(ARTIFACTS / 'mobile.png'), full_page=True)
    page.locator('#tab-grafo').click()
    expect(page.locator('.conflict-graph')).to_be_visible()
    page.locator('#tab-matriculas').click()
    page.locator('#enrollment-search').fill('CAL')
    assert page.locator('#enrollment-body tr').count() > 0
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

    # Distribuição local abre sem servidor nem conexão à internet.
    offline = context.new_page()
    offline_errors = []
    offline.on('pageerror', lambda error: offline_errors.append(str(error)))
    offline.goto((ROOT / 'dist' / 'index.html').as_uri())
    expect(offline.locator('#stat-students')).to_have_text('26')
    offline.locator('#generate-button').click()
    expect(offline.locator('.course-card')).to_have_count(8)
    expect(offline.locator('#generate-button')).to_be_enabled()
    assert not errors, errors
    assert not offline_errors, offline_errors
    print(json.dumps({'browser_errors': errors, 'offline_errors': offline_errors, 'csv_exported': len(rows), 'responsive': True, 'offline': True, 'artifacts': str(ARTIFACTS)}, ensure_ascii=False))
    browser.close()
