# Lỗi trong quá trình xử lý tool calls và luồng đối thoại

## Vấn đề

Trong file `api.js`, phát hiện các hạn chế trong việc xử lý tool calls và tiếp tục luồng đối thoại, cụ thể:

- Không có cách để tiếp tục đối thoại sau khi không còn tool calls
- Thiếu khả năng nhập liệu từ người dùng
- Xử lý nhiều tool calls một lúc bị sai vì mỗi tool call gửi một user message

## Nguyên nhân

Hàm `query()` được thiết kế quá cứng nhắc, không cho phép:
- Dừng luồng xử lý khi không còn tool calls
- Tương tác với người dùng để nhập thêm thông tin
- Đợi xử lý nhiều tool calls xong thì mới gửi tất cả trong một user message

## Giải pháp đã triển khai

Cập nhật hàm `query()` với các tính năng mới:

```javascript
export async function query({ 
  userPrompt, 
  tools, 
  systemPrompt, 
  model = SMALL_MODEL, 
  maxTokens = 1024, 
  acceptUserInput = false 
}) {
  // Thêm tham số acceptUserInput để điều khiển luồng
  // Hỗ trợ nhập liệu từ người dùng
  // Xử lý tool calls một cách linh hoạt hơn
}
```

Chi tiết thay đổi:
1. Thêm tham số `acceptUserInput` để điều khiển luồng
2. Hỗ trợ nhập liệu từ người dùng với `prompt-sync`
3. Xử lý tool calls một cách linh hoạt hơn
4. Cho phép thoát chương trình bằng lệnh 'q'

## Các cải tiến

- Linh hoạt hơn trong việc xử lý đối thoại
- Hỗ trợ tương tác trực tiếp với người dùng

## Status: FIXED