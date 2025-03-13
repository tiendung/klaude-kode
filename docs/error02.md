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

```sh
which git
# /usr/bin/git
which rg
# /usr/bin/rg
```

## Nguyên nhân

Vấn đề này xảy ra do môi trường PATH trong shell mà Bun.js khởi tạo (thông qua Node.js `spawn`) khác với môi trường PATH trong terminal mà bạn đang sử dụng. Khi Bun.js tạo một shell con thông qua PersistentShell, shell này không thừa hưởng đầy đủ các biến môi trường PATH hoặc không tải đúng các tệp cấu hình shell (`.bashrc`, `.zshrc`, v.v) nơi các đường dẫn đến các lệnh như `rg` đã được định nghĩa.

## Giải pháp đã triển khai

Đã cập nhật file `tools/grep.js` để sử dụng kết hợp `find` và `grep` là những lệnh cơ bản có sẵn trong hầu hết các hệ thống Unix thay vì phụ thuộc vào ripgrep (`rg`):

```js
const handler = async (toolCall) => {
  const { pattern, path: searchPath = '.', include } = toolCall.input;
  
  try {
    // Sử dụng lệnh find và grep
    let grepCmd = `find ${searchPath} -type f`;
    
    if (include) {
      grepCmd += ` -name "${include}"`;
    }
    
    grepCmd += ` -exec grep -l "${pattern}" {} \\;`;
    
    // Thực thi lệnh tìm kiếm
    const result = execSync(grepCmd, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    
    // Xử lý kết quả
    const files = result.trim().split('\n').filter(Boolean);
    
    return {
      output: files.join('\n')
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
};
```

Với giải pháp này:
1. Không cần phụ thuộc vào ripgrep (`rg`)
2. Sử dụng các lệnh cơ bản có sẵn (`find` và `grep`)
3. Đơn giản, dễ hiểu và dễ bảo trì
4. Tương thích với hầu hết các hệ thống Unix

### Các giải pháp thay thế khác

Nếu bạn vẫn muốn sử dụng ripgrep vì nó nhanh hơn cho codebase lớn:

1. **Đảm bảo PersistentShell tải biến môi trường PATH**
   Sửa file `persistent_shell.js` để đảm bảo shell thừa hưởng đúng PATH.

2. **Sử dụng đường dẫn tuyệt đối đến ripgrep**
   ```js
   let command = `/usr/bin/rg -li "${pattern}" ${path}`;
   ```

3. **Sử dụng thư viện JavaScript thay thế**
   Nếu không muốn phụ thuộc vào lệnh bên ngoài, bạn có thể sử dụng một thư viện JavaScript thuần túy để tìm kiếm.

## Status: FIXED
