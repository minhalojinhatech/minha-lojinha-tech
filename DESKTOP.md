# Aplicativo desktop

O aplicativo usa Tauri 2 e reutiliza a interface do site. O build web continua sendo executado com `npm run build`; os comandos desktop são separados.

## Desenvolvimento

```bash
npm run desktop:dev
```

## Build local

```bash
npm run desktop:build
```

O macOS gera `.app` e `.dmg`. Windows e Linux são gerados nos respectivos runners do GitHub Actions.

## Publicar instaladores

1. Configure `NEXT_PUBLIC_GITHUB_REPOSITORY` na Vercel com `proprietario/repositorio`.
2. Atualize a versão em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`.
3. Envie uma tag como `v0.1.0` ao GitHub ou execute manualmente o workflow `Desktop release`.
4. Revise e publique o rascunho criado em GitHub Releases.

A página `/baixar-app` consulta a release mais recente e mostra automaticamente os arquivos `.exe`, `.dmg`, `.AppImage` e `.deb`.

## Assinatura

Os builds funcionam sem certificados, mas Windows SmartScreen e macOS Gatekeeper podem mostrar alertas. Para distribuição comercial sem esses avisos, configure assinatura de código do Windows e Apple Developer ID/notarização nos secrets do GitHub.
