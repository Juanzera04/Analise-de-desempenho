from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

# ---------- CONFIGURAÇÃO ----------
URL = "https://juanzera04.github.io/Analise-de-desempenho/"

# Caminhos absolutos Windows para os arquivos
FILE_TAREFA = r"Y:\Gerencia Unidade\OUT\dim_Tarefa.csv"
FILE_COLABORADOR = r"Y:\Gerencia Unidade\OUT\dim_Colaborador.csv"
FILE_CLIENTE = r"Y:\Gerencia Unidade\OUT\dim_Cliente.csv"

# IDs dos inputs e botão
ID_TAREFA = "file-tarefa"
ID_COLABORADOR = "file-colaborador"
ID_CLIENTE = "file-cliente"
ID_PROCESSAR = "btn-processar"

WAIT_TIMEOUT = 30

# ---------- Helpers ----------
def make_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-notifications")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    return driver

def wait_for_presence(driver, by, selector, timeout=WAIT_TIMEOUT):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((by, selector)))

def wait_for_clickable(driver, by, selector, timeout=WAIT_TIMEOUT):
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((by, selector)))

def ensure_input_visible(driver, input_id):
    # Remove hidden e força display para que send_keys funcione
    script = f"""
    var el = document.getElementById('{input_id}');
    if (!el) return false;
    el.removeAttribute('hidden');
    el.style.display = 'block';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.style.position = 'static';
    return true;
    """
    return driver.execute_script(script)

def attach_file_to_input(driver, input_id, file_path):
    wait_for_presence(driver, By.ID, input_id)
    ensure_input_visible(driver, input_id)
    input_elem = driver.find_element(By.ID, input_id)
    input_elem.send_keys(file_path)

def wait_for_progress_count(driver, expected_count, timeout=WAIT_TIMEOUT):
    """
    Aguarda que o texto de status ou barra indique expected_count/3.
    Retorna True se detectado dentro do timeout.
    """
    end = time.time() + timeout
    while time.time() < end:
        try:
            status = driver.find_element(By.ID, "upload-status").text.lower()
            if f"({expected_count}/3)" in status or ("todos os arquivos anexados" in status and expected_count==3):
                return True
            # fallback: verifica largura da barra
            progress_el = driver.find_element(By.ID, "progress-bar")
            parent_w = driver.execute_script("return arguments[0].parentElement.getBoundingClientRect().width;", progress_el)
            w = driver.execute_script("return arguments[0].getBoundingClientRect().width;", progress_el)
            if parent_w > 0:
                perc = (w / parent_w) * 100
                if perc >= (expected_count/3.0)*100 - 1:  # tolerância
                    return True
        except Exception:
            pass
        time.sleep(0.25)
    return False

def is_browser_alive(driver):
    """Verifica se o navegador ainda está aberto"""
    try:
        # Tenta acessar uma propriedade simples do driver
        driver.current_url
        return True
    except Exception:
        return False

# ---------- Fluxo principal ----------
def main():
    driver = make_driver()
    try:
        driver.get(URL)
        print("Página aberta:", URL)

        # aguarda que os inputs existam na página
        wait_for_presence(driver, By.ID, ID_TAREFA)
        wait_for_presence(driver, By.ID, ID_COLABORADOR)
        wait_for_presence(driver, By.ID, ID_CLIENTE)

        # 1) anexar tarefa
        print("Anexando tarefa:", FILE_TAREFA)
        attach_file_to_input(driver, ID_TAREFA, FILE_TAREFA)
        if not wait_for_progress_count(driver, 1, timeout=30):
            print("Aviso: progresso 1/3 não detectado dentro do tempo.")
        else:
            print("Tarefa detectada (1/3).")

        # 2) anexar colaborador
        print("Anexando colaborador:", FILE_COLABORADOR)
        attach_file_to_input(driver, ID_COLABORADOR, FILE_COLABORADOR)
        if not wait_for_progress_count(driver, 2, timeout=30):
            print("Aviso: progresso 2/3 não detectado dentro do tempo.")
        else:
            print("Colaborador detectado (2/3).")

        # 3) anexar cliente
        print("Anexando cliente:", FILE_CLIENTE)
        attach_file_to_input(driver, ID_CLIENTE, FILE_CLIENTE)
        if not wait_for_progress_count(driver, 3, timeout=60):
            print("Aviso: progresso 3/3 não detectado dentro do tempo.")
        else:
            print("Cliente detectado (3/3).")

        # 4) aguardar e clicar no botão "Gerar Análise" (btn-processar)
        try:
            print("Aguardando botão processar ficar habilitado/clicável...")
            btn = wait_for_clickable(driver, By.ID, ID_PROCESSAR, timeout=30)
            # pequena pausa opcional para estabilidade
            time.sleep(0.5)
            btn.click()
            print("Botão 'Gerar Análise' clicado.")
        except Exception as e:
            print("Erro ao localizar/clicar em btn-processar:", str(e))

        print("Automação finalizada — o navegador permanecerá aberto para o usuário.")
        print("O programa será encerrado automaticamente se o navegador for fechado.")
        
        # Mantém o navegador aberto, mas verifica periodicamente se foi fechado
        try:
            while True:
                if not is_browser_alive(driver):
                    print("Navegador fechado pelo usuário. Encerrando programa...")
                    break
                time.sleep(1)
        except KeyboardInterrupt:
            print("Interrompido pelo usuário (CTRL+C). Encerrando...")

    except Exception as exc:
        print("Erro durante automação:", str(exc))
    finally:
        try:
            driver.quit()
        except Exception:
            pass

if __name__ == "__main__":
    main()