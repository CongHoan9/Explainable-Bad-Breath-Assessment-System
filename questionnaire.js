/* Questionnaire transcribed from Bảng hỏi( dành cho app).docx.
 * Option indices are identifiers, not clinical weights. */
const AssessmentQuestionnaire = (() => {
  const questions = [
    { title: 'Anh/chị có đang/đã từng gặp vấn đề về tiêu hóa nào?', options: ['Trào ngược / ợ chua', 'Viêm dạ dày / Nhiễm H. pylori', 'Viêm ruột (IBD)', 'Khó tiêu / chậm tiêu', 'Không có', 'Khác (nêu rõ)'], multiple: true, none: 4, detail: 5 },
    { title: 'Anh/chị có đang/đã từng gặp vấn đề về tai mũi họng hay hô hấp nào không?', options: ['Viêm xoang mạn', 'Viêm / Sỏi Amidan', 'Chảy dịch sau mũi', 'Bệnh lý phổi', 'Không có', 'Khác (nêu rõ)'], multiple: true, none: 4, detail: 5 },
    { title: 'Anh/chị có đang/đã từng gặp vấn đề về chuyển hóa / nội tiết nào?', options: ['Đái tháo đường / đái tháo đường phụ thuộc insulin', 'Suy thận / urê huyết / hội chứng mùi cá', 'Bệnh lý gan', 'Không có', 'Khác (nêu rõ)'], multiple: true, none: 3, detail: 4 },
    { title: 'Anh/chị có/đã từng bị dị ứng nào?', options: ['Không có', 'Dị ứng thuốc', 'Dị ứng thực phẩm'], multiple: true, none: 0 },
    { title: 'Anh/chị có đang sử dụng thuốc nào không?', options: ['Thuốc hạ huyết áp / an thần / lợi tiểu', 'Kháng sinh / Omeprazole / thuốc có chứa lưu huỳnh', 'Không dùng', 'Khác'], multiple: true, none: 2, detail: 3 },
    { title: 'Anh/chị có đang trong chế độ ăn kiêng nghiêm ngặt, nhịn ăn kéo dài hoặc hay bỏ bữa không?', options: ['Có', 'Không'] },
    { title: 'Anh/chị có thường xuyên sử dụng/ăn hoặc uống các loại thực phẩm nồng mùi như tỏi, hành, rượu, bia, thuốc lá… không?', options: ['Hành tỏi, gia vị nồng', 'Rượu bia', 'Thuốc lá', 'Không'], multiple: true, none: 3 },
    { title: 'Anh/chị cảm thấy hơi thở nặng mùi nhất vào thời điểm nào?', options: ['Mới ngủ dậy', 'Lúc nào thử cũng thấy hôi', 'Không để ý, không biết'] },
    { title: '(Nữ) Hơi thở của chị có nặng mùi hơn khi đến chu kỳ kinh nguyệt/khi mang thai không?', options: ['Có', 'Không', 'Không biết'], femaleOnly: true },
    { title: 'Tình trạng stress', options: ['Không căng thẳng / rất hiếm khi', 'Thường xuyên áp lực / stress / thức khuya'] },
    { title: 'Tần suất chải răng', options: ['< 2 lần/ngày', '2 lần/ngày', '> 2 lần/ngày', 'Không sử dụng bàn chải'] },
    { title: 'Thời điểm chải răng', options: ['Sáng ngay khi ngủ dậy / Tối trước khi đi ngủ', 'Sau mỗi bữa ăn', 'Tối trước khi đi ngủ + sáng sau khi ăn sáng'], brushingOnly: true },
    { title: 'Anh/chị sử dụng loại kem đánh răng nào?', options: ['Kem giúp hơi thở thơm mát / thảo dược', 'Kem nướu chắc khỏe / lợi viêm', 'Kem chống ê buốt', 'Không rõ thành phần / Loại khác'], detail: 3, detailOptional: true, brushingOnly: true },
    { title: 'Thời gian thay bàn chải của anh/chị?', options: ['< 3 tháng', '3 tháng', '> 3 tháng – 6 tháng', '> 6 tháng', 'Thay ngay khi thấy lông bàn chải bị tòe/hư'], brushingOnly: true },
    { title: 'Trong vệ sinh răng miệng hằng ngày, anh/chị có sử dụng thêm dụng cụ khác ngoài bàn chải không?', options: ['Cạo / chải lưỡi', 'Chỉ nha khoa / bàn chải kẽ', 'Nước súc miệng', 'Tăm nước', 'Không sử dụng'], multiple: true, none: 4 },
    { title: 'Thời gian anh/chị cảm thấy khoang miệng có mùi hôi hơi thở cách đây bao lâu?', options: ['Dưới 1 tháng', '1 – 6 tháng', 'Trên 6 tháng'] },
    { title: 'Anh/chị nhận thấy mùi hơi thở nhờ nguồn gốc nào?', options: ['Người xung quanh phàn nàn / bịt mũi', 'Bản thân tự cảm nhận thấy mùi', 'Bác sĩ chẩn đoán', 'Không'] },
    { title: 'Tiền sử đi khám hôi miệng', options: ['Chưa đi khám bao giờ', 'Đã khám nhiều nơi nhưng bác sĩ nói bình thường', 'Đã có chẩn đoán hôi miệng (ghi rõ chẩn đoán)'], detail: 2 },
    { title: 'Nướu (lợi) của anh/chị có biểu hiện nào?', options: ['Sưng, đỏ / chảy máu khi đánh răng', 'Răng lung lay / có cao răng, mảng bám', 'Không'] },
    { title: 'Anh/chị có các tình trạng răng miệng nào sau đây?', options: ['Có răng sâu chưa chữa', 'Có răng khôn đau nhức', 'Có đang niềng răng, đeo hàm giả, cắm implant, chụp răng (sau điều trị tủy), làm răng sứ thẩm mỹ, veneer,…', 'Không'], multiple: true, none: 3 },
    { title: 'Khoang miệng anh/chị có các vết loét nhiệt miệng tái lại, tổn thương hoại tử, hay khối nhô bất thường không?', options: ['Có', 'Không'] },
    { title: 'Anh/chị có thường cảm thấy khô rát khoang miệng, thiếu nước bọt, khó nuốt thức ăn không?', options: ['Có', 'Không'] },
    { title: 'Anh/chị hãy tự đánh giá mức độ mùi hôi miệng của mình', options: ['Không', 'Nhẹ', 'Trung bình', 'Nặng'] }
  ].map((q, index) => ({ ...q, short: q.title, section: index < 10 ? 'Tiền sử toàn thân' : index < 15 ? 'Vệ sinh răng miệng' : index < 18 ? 'Tiền sử mùi' : 'Dấu hiệu thực thể trong miệng' }));
  function skipped(index, answers, profile = {}) {
    return (questions[index].femaleOnly && profile.gender !== 'Nữ') || (questions[index].brushingOnly && answers[10] === 3);
  }
  function validAnswer(index, answer) {
    const q = questions[index];
    const valid = value => Number.isInteger(value) && value >= 0 && value < q.options.length;
    return q.multiple ? Array.isArray(answer) && answer.length > 0 && answer.every(valid) && new Set(answer).size === answer.length && !(answer.includes(q.none) && answer.length > 1) : valid(answer);
  }
  function needsDetail(index, answer) {
    const q = questions[index];
    return q.detail !== undefined && (Array.isArray(answer) ? answer.includes(q.detail) : answer === q.detail);
  }
  function complete(answers, profile, details = {}) {
    return profile && typeof profile === 'object'
      && typeof profile.name === 'string' && profile.name.trim().length > 0
      && details && typeof details === 'object'
      && Array.isArray(answers) && answers.length === questions.length && questions.every((q, index) => skipped(index, answers, profile) ? answers[index] === null : validAnswer(index, answers[index]) && (!needsDetail(index, answers[index]) || q.detailOptional || typeof details[index] === 'string' && details[index].trim().length > 0));
  }
  function display(record, index) {
    if (skipped(index, record.answers, record.administration)) return 'Không áp dụng';
    const answer = record.answers[index], q = questions[index];
    const label = (Array.isArray(answer) ? answer : [answer]).map(value => q.options[value]).filter(Boolean).join('; ');
    return label + (needsDetail(index, answer) && record.answerDetails?.[index] ? `: ${record.answerDetails[index]}` : '');
  }
  return { questions, skipped, validAnswer, needsDetail, complete, display };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AssessmentQuestionnaire;
