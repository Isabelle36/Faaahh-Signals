import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

let psProcess: cp.ChildProcess | null = null;

function getPSProcess(): cp.ChildProcess {
  if (psProcess && !psProcess.killed) { return psProcess; }

  // Spawn a persistent PowerShell process that waits for input
  psProcess = cp.spawn('powershell', [
    '-STA', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass',
    '-Command',
    `
    Add-Type -AssemblyName PresentationCore;
    $player = New-Object System.Windows.Media.MediaPlayer;
    while ($true) {
      $line = [Console]::In.ReadLine();
      if ($line -eq $null) { break; }
      $line = $line.Trim();
      if ($line -eq '') { continue; }
      try {
        $player.Stop();
        $player.Open([System.Uri]::new($line));
        $player.Play();
      } catch {}
    }
    `
  ]);

  psProcess.on('error', () => { psProcess = null; });
  psProcess.on('exit', () => { psProcess = null; });

  return psProcess;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Faaahhh Signals is watching your failures 👀');

  // Warm up the PowerShell process immediately on activation

  getPSProcess();

  context.subscriptions.push(
  vscode.commands.registerCommand('faaahhh.pickSound', async () => {
    const sounds = [
      { label: '😤 Faahh', value: 'Faahh' },
      { label: '😱 AHH Anime Girl', value: 'AHH-anime-girl' },
      { label: '🎺 AND HIS NAME IS JOHN CENA', value: 'and-his-name-is-john-cena' },
      { label: '🕵️ CID', value: 'cid' },
      { label: '😤 Faah But Bad One', value: 'faah-but-bad-one' },
      { label: '💀 Gawk Gawk', value: 'Gawk-Gawk' },
      { label: '🙅 Hell Nah Bruh', value: 'Hell-nah-bruh' },
      { label: '👋 Khatam Bye Bye', value: 'Khatam-Bye-Bye' },
      { label: '🐶 Laughing Dog Meme', value: 'laughing-dog-meme' },
      { label: '😲 Shocked', value: 'Shocked' },
      { label: '✨ Yooi', value: 'yooi' },
    ];

    const picked = await vscode.window.showQuickPick(sounds, {
      placeHolder: 'Choose your Faaahhh sound',
    });

    if (picked) {
      await vscode.workspace.getConfiguration('faaahhh').update('sound', picked.value, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Faaahhh sound set to: ${picked.label}`);
      playErrorSound(context); // preview the selected sound
    }
  })
);

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) { return; }
      if (e.exitCode === 130) { return; }
      const terminalName = e.terminal.name.toLowerCase();
      if (['agent', 'copilot', 'claude', 'task', 'extension'].some(n => terminalName.includes(n))) { return; }
      const cmd = e.execution.commandLine.value.toLowerCase().trim();
      if (['npm i', 'npm install', 'yarn', 'pnpm', 'pip install', 'brew'].some(c => cmd.startsWith(c))) { return; }
      playErrorSound(context);
    })
  );

  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.exitCode === undefined || e.exitCode === 0) { return; }
      if (e.exitCode === 130) { return; }
      playErrorSound(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('faaahhh.testSound', () => {
      playErrorSound(context);
      vscode.window.showInformationMessage('🔊 Playing error sound!');
    })
  );

  // Kill the persistent process on deactivate
  context.subscriptions.push({
    dispose: () => {
      if (psProcess && !psProcess.killed) { psProcess.kill(); }
    }
  });
}

function playErrorSound(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('faaahhh');
  if (!config.get<boolean>('enabled')) { return; }

  const selectedSound = config.get<string>('sound') || 'Faahh';
  const soundPath = path.join(context.extensionPath, 'sounds', `${selectedSound}.mp3`).replace(/\\/g, '/');

  const ps = getPSProcess();
  if (ps.stdin) {
    ps.stdin.write(soundPath + '\n');
  }
}

export function deactivate() {
  if (psProcess && !psProcess.killed) { psProcess.kill(); }
}