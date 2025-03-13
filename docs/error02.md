# Lỗi không tìm thấy lệnh ripgrep (rg) khi sử dụng GrepTool

## Vấn đề

Hiện nay có hiện tượng koding không sử dụng được những lệnh như `rg`, `git` ... trong khi đó những lệnh này đã được cài trong terminal và dùng bình thường.

Ví dụ như khi chạy lệnh:
```sh
bun index.js -p 'tìm hiểu tại sao lại không chạy được lệnh git trong persistent_shell.js mặc dù tôi đã cài và đang chạy nó bình thường trong terminal'
```

Thì gặp lỗi
```sh
> assistant
Tôi thấy có file ./tools/bash.js có thể liên quan vì lệnh git thường được thực thi thông qua bash. Hãy kiểm tra xem có ràng buộc git trong file này:

> GrepTool: {"pattern":"git","include":"*.js","path":"."}

> user
> toolu_01SUY7rf3kie2Vm3EBgZpXcy: {"error":"/bin/sh: 1: rg: not found"}
```

## Nguyên nhân

Lạ một cái là LSTool vẫn dùng được `ls` và cả `ls`, `git` và `rg` đều ở trong /usr/bin.
```sh
which ls
# /usr/bin/ls
which git
# /usr/bin/git
which rg
# /usr/bin/rg
```

## Giải pháp tạm thời

Tôi đã tạo symbolic link đến rg tại thư mục gốc:
```sh
ln -s /usr/bin/rg .
```
tại thư mục hiện hành (cùng chỗ với index.js và tools).

## Giải pháp chính thức

Đã sửa code trong `tools/grep.js` để:
1. Import module fs: `import fs from 'fs';`
2. Kiểm tra xem có file ./rg (bản local) không, nếu có thì dùng, nếu không thì dùng rg hệ thống:
```javascript
// Use local ./rg if it exists, otherwise try the system rg
const rgCmd = fs.existsSync('./rg') ? './rg' : 'rg';
let command = `${rgCmd} -li "${pattern}" ${path}`;
```

Với cách này, koding sẽ dùng ripgrep đã được symlink vào thư mục hiện tại nếu không tìm thấy lệnh `rg` trong PATH.