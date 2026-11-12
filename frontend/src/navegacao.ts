import { useSyncExternalStore } from "react";

const telas = ["inicial", "login", "cadastro", "home", "dashboard", "movimentacoes", "categorias", "importacao"] as const;
export type Tela = typeof telas[number];

function telaAtual(): Tela {
  return telas.find(tela => location.hash === "#/" + tela) ?? "inicial";
}

function observar(mudou: () => void) {
  window.addEventListener("hashchange", mudou);
  window.addEventListener("popstate", mudou);
  return () => {
    window.removeEventListener("hashchange", mudou);
    window.removeEventListener("popstate", mudou);
  };
}

export function useTela() {
  return useSyncExternalStore(observar, telaAtual);
}

export function navegar(tela: Tela, substituir = false) {
  if (tela === telaAtual()) return;
  const destino = "#/" + tela;
  if (substituir) history.replaceState(null, "", destino);
  else history.pushState(null, "", destino);
  // pushState e replaceState não emitem eventos de navegação.
  window.dispatchEvent(new Event("hashchange"));
}
