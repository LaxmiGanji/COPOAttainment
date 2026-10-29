package com.obe.copo.serviceImpl;

import com.obe.copo.dto.EvaluationResult;
import com.obe.copo.dto.RuleSimulationRequest;
import com.obe.copo.model.*;
import com.obe.copo.repository.ExamAssessmentRepository;
import com.obe.copo.service.ExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ExamServiceImpl implements ExamService {

    @Autowired
    private ExamAssessmentRepository examAssessmentRepository;

    @Override
    public List<ExamAssessment> getExamsByCourseId(String courseId) {
        return examAssessmentRepository.findByCourseId(courseId);//we can replace this with courseCode
    }

    @Override
    public Optional<ExamAssessment> getExamById(String id) {
        return examAssessmentRepository.findById(id);
    }

    @Override
    public ExamAssessment createExam(ExamAssessment exam) {
        return examAssessmentRepository.save(exam);
    }

    @Override
    public Optional<ExamAssessment> updateExam(String id, ExamAssessment updatedExam) {
        if (!examAssessmentRepository.existsById(id)) {
            return Optional.empty();
        }
        updatedExam.setId(id);
        return Optional.of(examAssessmentRepository.save(updatedExam));
    }

    @Override
    public boolean deleteExam(String id) {
        if (examAssessmentRepository.existsById(id)) {
            examAssessmentRepository.deleteById(id);
            return true;
        }
        return false;
    }


    //just for test. original --> evaluateStudentMarks
    @Override
    public EvaluationResult simulateRuleEngine(RuleSimulationRequest request) {
        ExamAssessment dummyExam = new ExamAssessment();
        dummyExam.setRuleEngineCase(request.getRuleEngineCase());
        dummyExam.setRuleConfig(request.getRuleConfig());
        dummyExam.setQuestions(request.getQuestions());
        dummyExam.setMaxMarks(50.0);

        return evaluateStudentMarks(dummyExam, request.getSubQuestionScores());
    }

    /**
     * Evaluates question choices and calculates student marks directly based on the exam's rule configuration:
     * - Top N: Picks top N questions sorted descending by score.
     * - Mandatory + Top N: Keeps mandatory questions plus best N of remaining.
     * - Pairwise OR: For each pair (A OR B), picks the highest score.
     */
    @Override
    public EvaluationResult evaluateStudentMarks(ExamAssessment exam, Map<String, Double> rawSubQuestionScores) {
        if (rawSubQuestionScores == null) {
            rawSubQuestionScores = new HashMap<>();
        }

        List<String> logSteps = new ArrayList<>();
        logSteps.add("Raw marks processed: " + rawSubQuestionScores.size() + " sub-question scores.");

        // Step 1: Aggregate sub-question scores to main questions
        //main question
        Map<String, Double> mainQuestionScores = new LinkedHashMap<>();
        if (exam != null && exam.getQuestions() != null) {
            for (QuestionConfig qConfig : exam.getQuestions()) {
                double qSum = 0.0;
                //checks sub questions
                if (qConfig.getSubQuestions() != null && !qConfig.getSubQuestions().isEmpty()) {
                    for (SubQuestionConfig subQ : qConfig.getSubQuestions()) {
                        Double score = rawSubQuestionScores.getOrDefault(subQ.getSubQuestionId(), 0.0);
                        if (score != null) qSum += score;
                    }
                } else {
                    Double score = rawSubQuestionScores.getOrDefault(qConfig.getQuestionId(), 0.0);
                    if (score != null) qSum = score;
                }
                //appending the main question with scores into mainQuestionScores dictionary
                mainQuestionScores.put(qConfig.getQuestionId(), qSum);
            }
        }

        // Step 2: Apply evaluation rule
        //get the rule case by default it is case 1 --> check in ENUM
        RuleEngineCase ruleCase = (exam != null && exam.getRuleEngineCase() != null)
                ? exam.getRuleEngineCase()
                : RuleEngineCase.CASE_1_TOP_N;
        //same here --> Model
        ExamRuleConfig config = (exam != null && exam.getRuleConfig() != null)
                ? exam.getRuleConfig()
                : new ExamRuleConfig();

        double totalScore = 0.0;
        List<String> selectedQuestions = new ArrayList<>();//to be calculated
        List<String> ignoredQuestions = new ArrayList<>();//to be ignored

        // Gather all mandatory question IDs (from config and question list)
        Set<String> mandatoryIds = new LinkedHashSet<>();
        //if i want to add the ids explicitly
        if (config.getMandatoryQuestionIds() != null) {
            mandatoryIds.addAll(config.getMandatoryQuestionIds());
        }
        if (exam != null && exam.getQuestions() != null) {
            for (QuestionConfig qc : exam.getQuestions()) {
                if (qc.isMandatory()) {
                    mandatoryIds.add(qc.getQuestionId());
                }
            }
        }

        // Total questions to evaluate on this exam (e.g. 4 out of 6)
        int totalQuestionsToEvaluate = config.getTopN() > 0
                ? config.getTopN()
                : (exam != null && exam.getQuestions() != null && !exam.getQuestions().isEmpty() ? exam.getQuestions().size() : 4);

        if (!mandatoryIds.isEmpty()) {
            // Mandatory questions must NEVER be taken as options; they are evaluated whether the student attempted them or not
            for (String mId : mandatoryIds) {
                selectedQuestions.add(mId);//add the mandatory questions directly to the selected questions
                double mScore = mainQuestionScores.getOrDefault(mId, 0.0);
                //if no mandatory question default mScore is 0.0
                totalScore += mScore;
            }

            // Only remaining slots (Total - Mandatory) can be chosen from optional questions
            int optionalSlots = Math.max(0, totalQuestionsToEvaluate - mandatoryIds.size());

            // Separate optional/choice pool
            //mainQuestionScores --> Map, questionId --> key, score --> value
            Map<String, Double> remainingPool = new LinkedHashMap<>();
            for (Map.Entry<String, Double> entry : mainQuestionScores.entrySet()) {
                if (!mandatoryIds.contains(entry.getKey())) {
                    //append the remaining questions which are not mandatory into remaining pool.
                    remainingPool.put(entry.getKey(), entry.getValue());
                }
            }

            // Resolve any internal OR pairs within the optional pool
            List<PairWiseOrGroup> pairs = config.getOrPairs() != null ? config.getOrPairs() : new ArrayList<>();
            Set<String> pairedProcessed = new HashSet<>();//both the add will be added even though one is selected
            Map<String, Double> candidates = new LinkedHashMap<>();


            for (PairWiseOrGroup pair : pairs) {
                if (!mandatoryIds.contains(pair.getQuestionA()) && !mandatoryIds.contains(pair.getQuestionB())) {
                    //default sA and sB as 0.0
                    double sA = remainingPool.getOrDefault(pair.getQuestionA(), 0.0);
                    double sB = remainingPool.getOrDefault(pair.getQuestionB(), 0.0);
                    if (sA >= sB) {
                        candidates.put(pair.getQuestionA(), sA);
                        ignoredQuestions.add(pair.getQuestionB());
                    } else {
                        candidates.put(pair.getQuestionB(), sB);
                        ignoredQuestions.add(pair.getQuestionA());
                    }
                    //finding the maximum and adding the least to ignoredQuestions
                    pairedProcessed.add(pair.getQuestionA());
                    pairedProcessed.add(pair.getQuestionB());
                }
            }

            for (Map.Entry<String, Double> entry : remainingPool.entrySet()) {
                if (!pairedProcessed.contains(entry.getKey())) {
                    candidates.put(entry.getKey(), entry.getValue());
                }
            }
            //store the resultant pair in the candidates dictionary


            // Sort remaining optional candidates descending by score
            List<Map.Entry<String, Double>> sortedCandidates = new ArrayList<>(candidates.entrySet());
            sortedCandidates.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
            //compare the values in the sortedCandidates and arrange it in the descending order

            for (int i = 0; i < sortedCandidates.size(); i++) {
                Map.Entry<String, Double> entry = sortedCandidates.get(i);
                if (i < optionalSlots) {
                    selectedQuestions.add(entry.getKey());
                    //fill the optional slots
                    totalScore += entry.getValue();
                    //add the score
                } else {
                    ignoredQuestions.add(entry.getKey());
                    //ignore the rest
                }
            }

            logSteps.add(String.format("Mandatory Evaluation: Compulsory %s counted (attempted or not). Picked best %d optional %s from %d available. Ignored: %s (Total: %.2f)",
                    mandatoryIds, optionalSlots, selectedQuestions.stream().filter(id -> !mandatoryIds.contains(id)).toList(), candidates.size(), ignoredQuestions, totalScore));
            //printing
//another case
//if mandatoryIds is empty and having case 3
        } else if (ruleCase == RuleEngineCase.CASE_3_PAIRWISE_OR) {
            List<PairWiseOrGroup> pairs = config.getOrPairs() != null ? config.getOrPairs() : new ArrayList<>();
            Set<String> processed = new HashSet<>();

            for (PairWiseOrGroup pair : pairs) {
                double sA = mainQuestionScores.getOrDefault(pair.getQuestionA(), 0.0);
                double sB = mainQuestionScores.getOrDefault(pair.getQuestionB(), 0.0);

                if (sA >= sB) {
                    selectedQuestions.add(pair.getQuestionA());
                    ignoredQuestions.add(pair.getQuestionB());
                    totalScore += sA;
                } else {
                    selectedQuestions.add(pair.getQuestionB());
                    ignoredQuestions.add(pair.getQuestionA());
                    totalScore += sB;
                }
                processed.add(pair.getQuestionA());
                processed.add(pair.getQuestionB());
            }

            for (String qId : mainQuestionScores.keySet()) {
                if (!processed.contains(qId)) {
                    selectedQuestions.add(qId);
                    totalScore += mainQuestionScores.get(qId);
                }
            }
            logSteps.add("Pairwise OR Selection: Selected " + selectedQuestions);
//another case
//if mandatory is empty and no choices
//it just counts top N questions to be evaluated
        } else {
            int n = Math.max(1, totalQuestionsToEvaluate);
            List<Map.Entry<String, Double>> sorted = new ArrayList<>(mainQuestionScores.entrySet());
            sorted.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

            for (int i = 0; i < sorted.size(); i++) {
                Map.Entry<String, Double> entry = sorted.get(i);
                if (i < n) {
                    selectedQuestions.add(entry.getKey());
                    totalScore += entry.getValue();
                } else {
                    ignoredQuestions.add(entry.getKey());
                }
            }
            logSteps.add(String.format("Top %d Selection: Picked %s (Total: %.2f), Ignored: %s",
                    n, selectedQuestions, totalScore, ignoredQuestions));
        }
        //EvaluationResult --> Model
        return new EvaluationResult(
                totalScore,
                selectedQuestions,
                ignoredQuestions,
                mainQuestionScores,
                logSteps,
                ruleCase
        );
    }
}
