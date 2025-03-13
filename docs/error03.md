```sh

bun min_shell.js 
Executing:
```bash
source /home/t/.bashrc
echo "Current PATH: $PATH" > /tmp/shell-debug-1741878253741
echo "Git location: $(which git)" >> /tmp/shell-debug-1741878253741
git status > /tmp/shell-stdout-1741878253741 2> /tmp/shell-stderr-1741878253741
echo $? > /tmp/shell-status-1741878253741
```

--- DEBUG INFO ---
Current PATH: /snap/bun-js/62/usr/sbin:/snap/bun-js/62/usr/bin:/snap/bun-js/62/sbin:/snap/bun-js/62/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
Git location:

--- RESULTS ---
Exit code: 127
stdout:
stderr: /bin/bash: line 4: git: command not found

```

