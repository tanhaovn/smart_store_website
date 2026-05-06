# SOFTWARE MEASUREMENT ANALYSIS REPORT

## SmartVision Shop

**Course:** CMU-CS 462 - Software Measurement and Analysis
**Project:** Software Measurement and Effort Estimation
**System:** SmartVision Shop (multi-role e-commerce web application)

---

## Suggested title page (for Word)

UNIVERSITY / FACULTY: ............................................................
CLASS: ............................................................
INSTRUCTOR: ............................................................
GROUP: ............................................................
MEMBERS: ............................................................
DATE: 27/04/2026

---

## Abstract

This report presents software measurement and effort estimation results for the SmartVision Shop system. The system was chosen because it has a clear scope of functionality, multiple user roles, and sufficient artifacts to apply measurement techniques such as GQM/GQIM, Function Point, Object Point, Feature Point, and COCOMO I.

The goal of this report is to determine what to measure, why it should be measured, the system size, how complexity affects development, and an estimated development effort. The results are academic analyses intended for the course assignment.

---

## Table of Contents

1. Introduction and brief presentation of the selected system
2. GQM / GQIM framework
3. Size analysis: Function Point, Object Point, Feature Point, and complexity discussion
4. Effort estimation using COCOMO I
5. Discussion of the relationship between measurement goals, size, complexity, and effort estimation
6. Limitations
7. Conclusion

---

## 1. Introduction and system overview

SmartVision Shop is an online e-commerce system that supports multiple roles: customers, sellers, administrators, and delivery staff. Core functionality includes registration and login, product search, shopping cart, order placement, order tracking, per-order chat, product management, user management, and delivery processing.

The system is suitable for software measurement analysis because it contains well-defined business workflows, multiple screens and data stores, and integration points between frontend, backend, and real-time services. It is a medium-sized system appropriate for applying GQM/GQIM and size/effort estimation techniques.

---

## 2. GQM / GQIM framework

### 2.1 Measurement Goal

Assess the size, complexity, and development effort required for SmartVision Shop in order to estimate resources needed for the current version.

### 2.2 Questions

- How large is the system in terms of user-visible functionality?
- Which components contribute most to development and integration complexity?
- How much effort is required to implement the current version?

### 2.3 Metrics

- Function Points
- Object Points
- Feature Points
- Estimated KLOC
- Effort estimated via COCOMO I

### 2.4 Interpretation

The GQM/GQIM framework translates goals into questions and questions into measurable metrics. The selected metrics reflect functional scope, user interfaces, and effort-related size measures.

---

## 3. Size analysis: Function Point, Object Point, Feature Point, and complexity discussion

### 3.1 Function Point analysis

SmartVision Shop emphasizes business functionality and user-facing features, making Function Point an appropriate size measure.

#### Assumptions for counting

- EI - External Input: 12
- EO - External Output: 6
- EQ - External Inquiry: 5
- ILF - Internal Logical File: 8
- EIF - External Interface File: 2

#### Weighting and calculation (example weights)

- EI (12) x 4 = 48
- EO (6) x 5 = 30
- EQ (5) x 4 = 20
- ILF (8) x 10 = 80
- EIF (2) x 7 = 14

Unadjusted Function Points (UFP) = 192
Adjusted Function Points ≈ 192 (assumed adjustment factor ~1.0)

#### Why Function Point fits

Function Point measures user-visible functional size and is well-suited for systems dominated by CRUD and business workflows like SmartVision Shop.

### 3.2 Object Point analysis

Object Points measure the user interface and screen complexity.

#### Assumptions for screens

- Simple screens: 18
- Medium screens: 10
- Complex screens: 5
- Reports/dashboards: 4

#### Calculation

- Simple: 18 x 1 = 18
- Medium: 10 x 2 = 20
- Complex: 5 x 3 = 15
- Dashboards: 4 x 2 = 8

Total Object Points (OP) = 61
Assuming 10% reuse, NOP ≈ 55

With a reference productivity of 10 OP/person-month, UI effort ≈ 5.5 person-months

### 3.3 Feature Point analysis

Feature Points add adjustment for algorithmic complexity. The system has mainly business workflows and limited heavy algorithms, so Feature Points are close to Function Points.

Feature Points ≈ 196 (small uplift over FP to reflect multi-role integration and chat features)

### 3.4 Complexity discussion

Overall complexity is medium:

- Multiple user roles increase navigation and authorization complexity.
- Several related data entities: users, products, orders, order_items, chats, deliveries, payments.
- Order state machine and per-order real-time chat add integration complexity.
- No heavy computational algorithms are present, so complexity is not high.

---

## 4. Effort estimation using COCOMO I

### 4.1 Model selected

COCOMO I - Organic mode (suitable for a medium-sized web application with familiar technology and a team experienced with common frameworks).

### 4.2 Assumptions

- Estimated size: 12 KLOC

### 4.3 Formulas

- Effort (person-months) = 2.4 \* (KLOC)^1.05
- Schedule (months) = 2.5 \* (Effort)^0.38

### 4.4 Calculation

- Effort = 2.4 \* 12^1.05 ≈ 32.5 person-months
- Schedule ≈ 2.5 \* 32.5^0.38 ≈ 9.35 months
- Approximate average team size = Effort / Schedule ≈ 3.5 people

---

## 5. Relationship between goals, size, complexity, and effort

Measurement goals determine which metrics to collect. Size metrics reflect functional and UI scope; complexity influences effort multipliers. For SmartVision Shop, the combination of multiple roles and integration points raises size and complexity, which in turn increases estimated effort.

---

## 6. Limitations

- Metrics are based on assumptions and not on historical project data.
- Function Point and Object Point counts depend on counting rules and may vary in practice.
- KLOC is an estimate; COCOMO I results scale with that assumption.
- If the system adds machine learning, complex search, or heavier real-time features, estimates would change significantly.

---

## 7. Conclusion

SmartVision Shop is suitable for software measurement exercises. Estimated size: FP ≈ 192; OP ≈ 61; Feature Points ≈ 196. COCOMO I effort ≈ 32.5 person-months with an approximate schedule of 9.3 months. The report demonstrates the relationship between measurement goals, size, complexity, and effort estimation for a medium-sized e-commerce application.

---

## Appendix: Database overview

Refer to the project's ERD and models for table definitions including Users, Products, Orders, Order_Items, Carts, Chat_Messages, Delivery_Assignments, and Payment_Transactions.
