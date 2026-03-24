"""
quizzes/serializers.py
"""
from rest_framework import serializers
from .models import Answer, Question, Quiz, QuizAttempt


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Answer
        fields = ['id', 'content', 'order_index']
        # Không trả về is_correct khi student xem đề — ẩn đáp án đúng


class AnswerWithCorrectSerializer(serializers.ModelSerializer):
    """Dùng sau khi nộp bài — trả về is_correct để hiển thị kết quả."""
    class Meta:
        model  = Answer
        fields = ['id', 'content', 'is_correct', 'order_index']


class AnswerWriteSerializer(serializers.ModelSerializer):
    """Instructor tạo đáp án — 5.2.3"""
    class Meta:
        model  = Answer
        fields = ['id', 'content', 'is_correct', 'order_index']


class QuestionSerializer(serializers.ModelSerializer):
    """Student xem đề — ẩn is_correct trong answers."""
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'content', 'question_type', 'points', 'order_index', 'answers']


class QuestionWithResultSerializer(serializers.ModelSerializer):
    """Trả về sau khi nộp bài — kèm is_correct và explanation."""
    answers = AnswerWithCorrectSerializer(many=True, read_only=True)

    class Meta:
        model  = Question
        fields = ['id', 'content', 'question_type', 'points', 'order_index', 'explanation', 'answers']


class QuestionWriteSerializer(serializers.ModelSerializer):
    """Instructor tạo / chỉnh sửa câu hỏi — 5.2.3"""
    answers = AnswerWriteSerializer(many=True, required=False)

    class Meta:
        model  = Question
        fields = ['id', 'quiz', 'content', 'question_type', 'points', 'explanation', 'order_index', 'answers']

    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        question = Question.objects.create(**validated_data)
        for ans in answers_data:
            Answer.objects.create(question=question, **ans)
        return question

    def update(self, instance, validated_data):
        answers_data = validated_data.pop('answers', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if answers_data is not None:
            instance.answers.all().delete()
            for ans in answers_data:
                Answer.objects.create(question=instance, **ans)
        return instance


class QuizSerializer(serializers.ModelSerializer):
    """Student xem thông tin bài kiểm tra (chưa có câu hỏi)."""
    class Meta:
        model  = Quiz
        fields = ['id', 'title', 'description', 'pass_score', 'time_limit', 'max_attempts']


class QuizDetailSerializer(serializers.ModelSerializer):
    """Student xem đề — kèm câu hỏi và đáp án (không có is_correct)."""
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model  = Quiz
        fields = ['id', 'title', 'description', 'pass_score', 'time_limit', 'max_attempts', 'questions']


class QuizWriteSerializer(serializers.ModelSerializer):
    """Instructor tạo / chỉnh sửa bài kiểm tra — 5.2.3"""
    class Meta:
        model  = Quiz
        fields = ['id', 'lesson', 'title', 'description', 'pass_score', 'time_limit', 'max_attempts']


class QuizAttemptSubmitSerializer(serializers.Serializer):
    """
    Học viên nộp bài — 5.1.4
    Body: { answers: { "<question_id>": ["<answer_id>", ...] } }
    """
    answers = serializers.DictField(
        child=serializers.ListField(child=serializers.UUIDField()),
        help_text='{ question_id: [answer_id, ...] }',
    )


class QuizAttemptResultSerializer(serializers.ModelSerializer):
    """Kết quả sau khi nộp bài — kèm câu hỏi + đáp án đúng."""
    questions = serializers.SerializerMethodField()

    class Meta:
        model  = QuizAttempt
        fields = ['id', 'score', 'passed', 'answers_snapshot', 'started_at', 'submitted_at', 'questions']

    def get_questions(self, obj):
        qs = obj.quiz.questions.prefetch_related('answers').order_by('order_index')
        return QuestionWithResultSerializer(qs, many=True).data


class QuizAttemptListSerializer(serializers.ModelSerializer):
    """Danh sách các lần làm bài của học viên."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model  = QuizAttempt
        fields = ['id', 'quiz_title', 'score', 'passed', 'started_at', 'submitted_at']