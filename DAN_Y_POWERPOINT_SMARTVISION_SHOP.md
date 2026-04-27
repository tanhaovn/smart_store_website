# Dàn Ý PowerPoint - SmartVision Shop

## Slide 1. Title Slide

- CMU-CS 462 - Software Measurement and Analysis
- Software Measurement and Effort Estimation
- Đề tài: SmartVision Shop
- Nhóm thực hiện: ................................
- Thành viên: ................................
- Giảng viên hướng dẫn: ................................
- Thời gian: 27/04/2026

## Slide 2. System Overview

- SmartVision Shop là hệ thống bán hàng trực tuyến mô phỏng theo mô hình thương mại điện tử thu nhỏ.
- Hệ thống có 4 vai trò: USER, SELLER, ADMIN, GIAO HÀNG.
- Chức năng chính: đăng nhập, tìm kiếm, giỏ hàng, đặt hàng, theo dõi đơn, chat, quản lý sản phẩm và giao hàng.

## Slide 3. GQM / GQIM

- Measurement goal: đánh giá size, complexity và effort của hệ thống.
- Questions:
  - Hệ thống lớn đến mức nào?
  - Thành phần nào làm tăng độ phức tạp?
  - Cần bao nhiêu effort để phát triển phiên bản hiện tại?
- Metrics:
  - Function Point
  - Object Point
  - Feature Point
  - KLOC
  - COCOMO I effort

## Slide 4. Size Analysis - Function Point

- Assumptions:
  - EI = 12
  - EO = 6
  - EQ = 5
  - ILF = 8
  - EIF = 2
- UFP calculation:
  - 12 x 4 = 48
  - 6 x 5 = 30
  - 5 x 4 = 20
  - 8 x 10 = 80
  - 2 x 7 = 14
- Total UFP = 192
- Adjusted FP ≈ 192

## Slide 5. Size Analysis - Object Point & Feature Point

- Object Point assumptions:
  - Simple screens = 18
  - Medium screens = 10
  - Complex screens = 5
  - Dashboards = 4
- OP calculation:
  - 18 x 1 = 18
  - 10 x 2 = 20
  - 5 x 3 = 15
  - 4 x 2 = 8
- Total OP = 61
- Reuse 10% -> NOP ≈ 55
- Feature Point ≈ 196

## Slide 6. Complexity Discussion

- Hệ thống có nhiều vai trò nên phân quyền và điều hướng phức tạp hơn ứng dụng CRUD đơn giản.
- Có nhiều bảng dữ liệu liên kết: users, products, orders, chats, deliveries, payments.
- Có luồng trạng thái đơn hàng và chat thời gian thực.
- Complexity ở mức trung bình.

## Slide 7. Effort Estimation - COCOMO I

- Model selected: COCOMO I - Organic mode
- Assumption: 12 KLOC
- Formula:
  - Effort = 2.4 x (KLOC)^1.05
  - Schedule = 2.5 x (Effort)^0.38
- Calculation:
  - Effort ≈ 32.5 person-months
  - Schedule ≈ 9.35 months
  - Team size ≈ 3.5 người

## Slide 8. Relationship Between Goal, Size, Complexity, and Effort

- Goal giúp xác định cần đo gì.
- Size metrics phản ánh phạm vi chức năng và giao diện.
- Complexity tăng theo số vai trò, số luồng và số bảng dữ liệu.
- Effort estimation dùng size và complexity làm đầu vào để ước lượng nguồn lực.

## Slide 9. Limitations

- Các số liệu là ước lượng, không phải đo lường từ dự án lịch sử thực tế.
- Function Point, Object Point và Feature Point phụ thuộc vào giả định đếm.
- COCOMO I dùng 12 KLOC là giả định gần đúng.
- Kết quả có thể thay đổi nếu hệ thống bổ sung AI, thanh toán nâng cao hoặc realtime nhiều hơn.

## Slide 10. Conclusion

- SmartVision Shop là bài toán phù hợp để áp dụng software measurement.
- Hệ thống có quy mô vừa, nhiều vai trò và nhiều luồng nghiệp vụ.
- Kết quả chính:
  - Function Point ≈ 192
  - Object Point ≈ 61
  - Feature Point ≈ 196
  - Effort ≈ 32.5 person-months
  - Schedule ≈ 9.35 months
- Báo cáo chứng minh được mối liên hệ giữa measurement goals, size, complexity và effort.
