# BÁO CÁO PHÂN TÍCH ĐO LƯỜNG PHẦN MỀM

## SmartVision Shop

**Môn học:** CMU-CS 462 - Software Measurement and Analysis  
**Đề tài:** Software Measurement and Effort Estimation  
**Hệ thống được chọn:** SmartVision Shop  
**Loại hệ thống:** Ứng dụng web bán hàng đa vai trò

---

## Trang bìa gợi ý khi đưa vào Word

**TRƯỜNG / KHOA:** ............................................................  
**LỚP:** ............................................................  
**GIẢNG VIÊN HƯỚNG DẪN:** ............................................................  
**NHÓM THỰC HIỆN:** ............................................................  
**THÀNH VIÊN:** ............................................................  
**THỜI GIAN:** 27/04/2026

---

## Lời mở đầu

Báo cáo này trình bày kết quả phân tích đo lường phần mềm và ước lượng effort cho hệ thống SmartVision Shop. Hệ thống được chọn vì có phạm vi chức năng rõ ràng, nhiều vai trò người dùng và đủ dữ liệu để áp dụng các kỹ thuật đo lường phần mềm như GQM/GQIM, Function Point, Object Point, Feature Point và COCOMO I.

Mục tiêu của báo cáo là làm rõ: cần đo cái gì, vì sao cần đo, hệ thống lớn đến mức nào, độ phức tạp ảnh hưởng ra sao và effort phát triển ước lượng là bao nhiêu. Các kết quả trong báo cáo mang tính phân tích học thuật và phục vụ mục đích học phần.

---

## Mục lục

1. Introduction and brief presentation of the selected system
2. GQM / GQIM framework
3. Size analysis: Function Point, Object Point, Feature Point, and complexity discussion
4. Effort estimation using COCOMO I
5. Discussion of the relationship between measurement goals, size, complexity, and effort estimation
6. Limitations
7. Conclusion

---

## 1. Introduction and brief presentation of the selected system

SmartVision Shop là một hệ thống bán hàng trực tuyến mô phỏng theo mô hình thương mại điện tử thu nhỏ. Hệ thống phục vụ nhiều vai trò khác nhau gồm khách hàng, người bán, quản trị viên và nhân viên giao hàng. Phạm vi chức năng bao gồm đăng ký và đăng nhập, tra cứu sản phẩm, quản lý giỏ hàng, đặt hàng, theo dõi đơn, chat theo đơn, quản lý sản phẩm, quản lý người dùng và xử lý giao hàng.

Hệ thống phù hợp cho bài toán đo lường phần mềm vì có đủ luồng nghiệp vụ, dữ liệu, màn hình và mức độ tích hợp giữa frontend, backend và realtime. Đây là một hệ thống quy mô vừa, đủ rõ ràng để áp dụng GQM/GQIM, phân tích size/complexity và ước lượng effort bằng COCOMO.

---

## 2. GQM / GQIM framework

### 2.1. Measurement goal

Mục tiêu đo lường là đánh giá mức độ lớn, độ phức tạp và effort phát triển của SmartVision Shop để ước lượng nguồn lực cần thiết cho phiên bản hiện tại.

### 2.2. Questions

- Hệ thống có phạm vi chức năng lớn đến mức nào?
- Thành phần nào làm tăng độ phức tạp phát triển và tích hợp?
- Cần bao nhiêu effort để hoàn thành phiên bản hiện tại?

### 2.3. Metrics

- Function Point
- Object Point
- Feature Point
- KLOC ước lượng
- Effort theo COCOMO I

### 2.4. Interpretation

Khung GQM/GQIM không nhằm tạo ra con số ngay lập tức mà dùng để định nghĩa mục tiêu đo lường, chuyển mục tiêu thành câu hỏi và câu hỏi thành metric. Với hệ thống này, các metric được chọn đều gắn trực tiếp với kích thước chức năng, giao diện và effort phát triển.

---

## 3. Size analysis: Function Point, Object Point, Feature Point, and complexity discussion

### 3.1. Function Point analysis

SmartVision Shop là hệ thống thiên về nghiệp vụ, vì vậy Function Point là thước đo phù hợp để phản ánh khối lượng chức năng mà người dùng nhìn thấy.

#### a) Assumptions for counting

Ước lượng các nhóm chức năng chính như sau:

- EI - External Input: 12
- EO - External Output: 6
- EQ - External Inquiry: 5
- ILF - Internal Logical File: 8
- EIF - External Interface File: 2

#### b) Weighting and calculation

| Loại chức năng                | Số lượng | Trọng số trung bình |    Điểm |
| ----------------------------- | -------: | ------------------: | ------: |
| EI - External Input           |       12 |                   4 |      48 |
| EO - External Output          |        6 |                   5 |      30 |
| EQ - External Inquiry         |        5 |                   4 |      20 |
| ILF - Internal Logical File   |        8 |                  10 |      80 |
| EIF - External Interface File |        2 |                   7 |      14 |
| **Tổng UFP**                  |          |                     | **192** |

#### c) Result

- Unadjusted Function Point (UFP) = 192
- Hệ số điều chỉnh tổng quát được xem xấp xỉ 1.0
- Adjusted Function Point xấp xỉ: **192 FP**

#### d) Why this size measure fits

Function Point phù hợp vì SmartVision Shop chủ yếu là các chức năng người dùng nhìn thấy như đăng nhập, tìm kiếm, giỏ hàng, đặt hàng, quản lý đơn, chat và quản trị dữ liệu.

### 3.2. Object Point analysis

Object Point phù hợp vì giao diện hệ thống có nhiều form, bảng dữ liệu, dashboard và luồng tác vụ theo vai trò.

#### a) Assumptions for counting screens

- Màn hình đơn giản: 18
- Màn hình trung bình: 10
- Màn hình phức tạp: 5
- Báo cáo / dashboard: 4

#### b) Calculation

- Simple screens: 18 x 1 = 18
- Medium screens: 10 x 2 = 20
- Complex screens: 5 x 3 = 15
- Reports / dashboards: 4 x 2 = 8

Tổng Object Point:

- OP = 18 + 20 + 15 + 8 = **61 OP**

#### c) Reuse adjustment

Giả sử tái sử dụng được 10% giao diện / thành phần:

- NOP = 61 x (1 - 0.10) = 61 x 0.90 = **54.9 ≈ 55 OP**

#### d) Result and interpretation

- Object Point dùng để ước lượng nỗ lực phát triển giao diện nhanh hơn Function Point.
- Với năng suất tham khảo 10 OP/người-tháng, effort giao diện riêng khoảng: **5.5 person-months**

### 3.3. Feature Point analysis

Feature Point thường phản ánh tốt hơn nếu hệ thống có nhiều xử lý logic phức tạp. Với SmartVision Shop, phần lớn chức năng vẫn là business workflow và CRUD, nên Feature Point không chênh lệch quá xa Function Point.

#### a) Estimation approach

- Vì hệ thống chưa có thuật toán nặng như machine learning hay tối ưu tìm kiếm phức tạp, Feature Point có thể xem gần với Function Point.
- Ta dùng một uplift nhỏ để phản ánh các luồng đa vai trò, chat theo đơn và giao hàng.

#### b) Calculation

- Feature Point xấp xỉ = 192 x 1.02 = **195.84 ≈ 196**

#### c) Interpretation

- Feature Point ước lượng khoảng **196** cho thấy hệ thống có kích thước chức năng vừa phải và có thêm một mức tăng nhẹ do tích hợp nhiều vai trò và luồng giao tiếp.

### 3.4. Complexity discussion

Độ phức tạp của SmartVision Shop ở mức **trung bình**:

- Có nhiều vai trò nên phân quyền và điều hướng màn hình phức tạp hơn web CRUD đơn giản.
- Có nhiều thực thể dữ liệu liên kết: users, products, orders, order_items, chats, deliveries, payments.
- Có luồng trạng thái đơn hàng và chat thời gian thực, làm tăng số điểm tích hợp giữa frontend, backend và socket.
- Tuy nhiên, hệ thống chưa có thuật toán tính toán nặng, chưa có AI lõi hoặc tối ưu phức tạp, nên chưa phải mức phức tạp cao.

---

## 4. Effort estimation using COCOMO I

### 4.1. Model selected

Chọn **COCOMO I - Organic mode** vì đây là một web application quy mô vừa, yêu cầu nghiệp vụ rõ, nhóm phát triển có thể quen nhanh với framework và phần lớn chức năng là CRUD / workflow.

### 4.2. Assumptions

- Kích thước mã nguồn ước lượng: **12 KLOC**
- Mô hình: **Organic**

### 4.3. Formula

Với COCOMO I - Organic:

- Effort (PM) = 2.4 x (KLOC)^1.05
- Schedule (months) = 2.5 x (Effort)^0.38

### 4.4. Calculation process

#### a) Effort

- Effort = 2.4 x 12^1.05
- 12^1.05 ≈ 13.54
- Effort ≈ 2.4 x 13.54 = **32.5 person-months**

#### b) Schedule

- Schedule = 2.5 x 32.5^0.38
- 32.5^0.38 ≈ 3.74
- Schedule ≈ 2.5 x 3.74 = **9.35 months**

#### c) Team size approximation

- Average team size = 32.5 / 9.35 ≈ **3.5 người**

### 4.5. Final estimation result

- Estimated effort: **32.5 person-months**
- Estimated schedule: **9.3 - 9.4 months**
- Estimated average team size: **3 to 4 people**

---

## 5. Discussion of the relationship between measurement goals, size, complexity, and effort estimation

Measurement goal ở mục 2 giúp xác định cần đo cái gì và đo để làm gì. Từ goal đó, chúng ta chọn size metrics ở mục 3 để phản ánh phạm vi chức năng và giao diện của hệ thống. Khi size tăng, đặc biệt là khi có nhiều vai trò, nhiều bảng dữ liệu và nhiều luồng trạng thái, complexity cũng tăng theo. Complexity cao hơn sẽ kéo effort ước lượng lên trong COCOMO.

Nói cách khác, goal dẫn tới metrics; metrics phản ánh size; size và complexity là cơ sở để suy ra effort. Với SmartVision Shop, sự kết hợp giữa các module USER, SELLER, ADMIN và GIAO HÀNG tạo ra kích thước chức năng đủ lớn để có thể áp dụng Function Point, Object Point và COCOMO một cách hợp lý.

---

## 6. Limitations

- Các số liệu là ước lượng dựa trên đặc điểm hệ thống và tài liệu hiện có, không phải số đo từ dự án lịch sử thực tế.
- Function Point và Object Point được tính theo giả định phù hợp với bài tập, nên có thể khác nếu đo theo đội dự án thực tế.
- Feature Point không có một chuẩn duy nhất trong mọi giáo trình, vì vậy giá trị ở đây mang tính so sánh và định hướng.
- COCOMO I dùng 12 KLOC là giả định, nên kết quả effort cũng là kết quả gần đúng.
- Hệ thống thực tế có thể thay đổi nếu bổ sung AI, thanh toán nâng cao hoặc realtime nhiều hơn.

---

## 7. Conclusion

SmartVision Shop là một hệ thống phù hợp để phân tích đo lường phần mềm vì có đầy đủ chức năng nghiệp vụ, nhiều vai trò và nhiều luồng xử lý. Phân tích GQM/GQIM cho thấy mục tiêu đo lường là đánh giá size, complexity và effort. Phân tích size cho thấy hệ thống có khoảng 192 Function Point, 61 Object Point và khoảng 196 Feature Point tương đương. Ước lượng COCOMO I cho thấy effort phát triển khoảng 32.5 person-months với thời gian khoảng 9.3 tháng.

Kết quả này cho thấy SmartVision Shop là một bài toán vừa đủ lớn để áp dụng các kỹ thuật software measurement một cách có ý nghĩa, đồng thời vẫn nằm trong phạm vi có thể triển khai và trình bày tốt trong thời gian làm bài tập.
