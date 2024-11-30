import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  IconButton,
  Autocomplete,
  TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import chanranData from '../probability/찬란_ALL.json';
import youngrongData from '../probability/영롱_ALL.json';
import junggeoData from '../probability/정교_ALL.json';

const CraftingCalculator = () => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [results, setResults] = useState([]);
  const [visibleRanks, setVisibleRanks] = useState({
    '1랭크': true,
    '2랭크': false,
    '3랭크': false
  });

  const toolsData = {
    '찬란': chanranData,
    '영롱': youngrongData,
    '정교': junggeoData
  };

  // 옵션 추가
  const addOption = () => {
    setSelectedOptions([...selectedOptions, { option: '', level: '' }]);
  };

  // 옵션 제거
  const removeOption = (index) => {
    setSelectedOptions(selectedOptions.filter((_, i) => i !== index));
  };

  // 옵션 또는 레벨 변경
  const updateOption = (index, field, value) => {
    const newOptions = [...selectedOptions];
    
    if (field === 'option') {
      // 이미 선택된 옵션인지 확인
      const isDuplicate = selectedOptions.some((opt, i) => 
        i !== index && opt.option === value
      );
      
      if (isDuplicate) {
        // 중복된 옵션 선택 시 처리 (선택 무시)
        return;
      }
      
      // 옵션이 변경되면 레벨 초기화
      newOptions[index] = { 
        option: value, 
        level: '' 
      };
    } else {
      // 레벨 업데이트
      newOptions[index] = { 
        ...newOptions[index], 
        [field]: value 
      };
    }
    
    setSelectedOptions(newOptions);
  };

  // 특정 옵션의 가능한 레벨 목록 추출
  const getAvailableLevels = (option) => {
    const levels = new Set();
    
    Object.values(toolsData).forEach(toolData => {
      if (!toolData[option]) return;

      Object.values(toolData[option]).forEach(itemTypeData => {
        Object.values(itemTypeData).forEach(raceData => {
          Object.values(raceData).forEach(rankData => {
            Object.keys(rankData.레벨별확률).forEach(level => {
              levels.add(level);
            });
          });
        });
      });
    });

    return Array.from(levels).sort((a, b) => Number(a) - Number(b));
  };

  // 모든 가능한 옵션 목록 추출
  const getAllOptions = () => {
    const options = new Set([
      ...Object.keys(chanranData),
      ...Object.keys(youngrongData),
      ...Object.keys(junggeoData)
    ]);
    return Array.from(options);
  };

  // 조합 계산 함수
  const combination = (n, r) => {
    if (r > n) return 0;
    let numerator = 1;
    let denominator = 1;
    for (let i = 0; i < r; i++) {
      numerator *= (n - i);
      denominator *= (i + 1);
    }
    return numerator / denominator;
  };

  // 확률 계산 함수
  const getTotalProbability = (toolData, itemType, race, rank, selectedOptions)  => {

    // 등장 확률 계산 ( 듀얼, 트리플의 경우 1번 옵션만 가지고 하면 된다. )
    const { option, level } = selectedOptions[0]; 
    const selectedOptionCount = selectedOptions.length; // 유저 선택 옵션 개수
    const allOptionCount = toolData[option][itemType][race][rank]['개수'] // 등장 확률 계산
    let totalOptionProbability = combination(allOptionCount - selectedOptionCount, 3 - selectedOptionCount) / combination(allOptionCount, 3);

    // 레벨 확률 계산
    let totalLevelProbability = 1;
    for (const selected of selectedOptions) {
      const { option, level } = selected;
      const levelProbs = toolData[option]?.[itemType]?.[race]?.[rank]?.['레벨별확률'];
      
      if (!levelProbs)
        return 0;
      let levelProbability = 0;
      Object.entries(levelProbs).forEach(([lvl, prob]) => {
        if (Number(lvl) >= Number(level)) {
          const numericProb = parseFloat(prob) / 100; // 문자열에서 '%' 제거 후 숫자로 변환
          levelProbability += numericProb; // totalProbability에 더하기
        }
      });
      totalLevelProbability *= levelProbability;
    }

    return totalOptionProbability * totalLevelProbability;
  };

  // 모든 도구의 결과를 하나로 합치고 정렬하는 함수
  const calculateAllCombinations = () => {
    const allResults = [];

    Object.entries(toolsData).forEach(([toolName, toolData]) => {
      if (selectedOptions.length === 0 || selectedOptions.some(opt => !opt.option || !opt.level)) {
        return;
      }

      const firstOption = selectedOptions[0].option;
      if (!toolData[firstOption]) return;

      Object.entries(toolData[firstOption]).forEach(([itemType, itemTypeData]) => {
        Object.entries(itemTypeData).forEach(([race, raceData]) => {
          Object.entries(raceData).forEach(([rank, _]) => {
            // 등장 확률 구하기
            const totalProbability = getTotalProbability(toolData, itemType, race, rank, selectedOptions);
            
            if (totalProbability > 0) {
              allResults.push({
                tool: toolName,
                itemType,
                race,
                rank,
                probability: totalProbability,
                expectedTries: 1 / totalProbability
              });
            }
          });
        });
      });
    });

    return allResults.sort((a, b) => a.expectedTries - b.expectedTries);
  };

  useEffect(() => {
    const calculatedResults = calculateAllCombinations();
    setResults(calculatedResults);
  }, [selectedOptions]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" align="center" gutterBottom>
          마비노기 세공 기댓값 계산기
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <FormGroup row>
            {Object.keys(visibleRanks).map(rank => (
              <FormControlLabel
                key={rank}
                control={
                  <Checkbox
                    checked={visibleRanks[rank]}
                    onChange={(e) => setVisibleRanks(prev => ({
                      ...prev,
                      [rank]: e.target.checked
                    }))}
                  />
                }
                label={rank}
              />
            ))}
          </FormGroup>
        </Box>

        <Container maxWidth="md" sx={{ mb: 3 }}>
          {selectedOptions.map((selected, index) => (
            <Grid 
              container 
              spacing={2} 
              key={index} 
              sx={{ mb: 2 }} 
              alignItems="center"
              justifyContent="center"
            >
              <Grid item xs={12} sm={7}>
                <Autocomplete
                  value={selected.option}
                  onChange={(_, newValue) => updateOption(index, 'option', newValue)}
                  options={getAllOptions().filter(option => 
                    // 이미 선택된 옵션 제외
                    !selectedOptions.some((selected, i) => 
                      i !== index && selected.option === option
                    )
                  )}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="옵션 선택" 
                      placeholder="옵션을 입력하세요"
                    />
                  )}
                  isOptionEqualToValue={(option, value) => option === value}
                  filterOptions={(options, { inputValue }) => {
                    return options.filter(option =>
                      option.toLowerCase().includes(inputValue.toLowerCase())
                    );
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  value={selected.level}
                  onChange={(_, newValue) => updateOption(index, 'level', newValue)}
                  options={selected.option ? getAvailableLevels(selected.option) : []}
                  disabled={!selected.option}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="레벨 선택" 
                      placeholder="레벨을 입력하세요"
                    />
                  )}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderOption={(props, option) => (
                    <li {...props}>{option} 레벨 이상</li>
                  )}
                  getOptionLabel={(option) => option ? `${option} 레벨 이상` : ''}
                  filterOptions={(options, { inputValue }) => {
                    // 입력에서 '레벨 이상' 문자열 제거하고 숫자만 추출
                    const searchValue = inputValue.replace(/레벨\s*이상/g, '').trim();
                    
                    return options.filter(option => 
                      option.toString().includes(searchValue)
                    );
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <IconButton 
                  onClick={() => removeOption(index)} 
                  color="error"
                  sx={{ display: 'flex', margin: '0 auto' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button 
              startIcon={<AddIcon />}
              onClick={addOption}
              variant="outlined"
            >
              옵션 추가
            </Button>
          </Box>
        </Container>

        {/* 결과 테이블 */}
        {results.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>세공 도구</TableCell>
                  <TableCell>아이템 부위</TableCell>
                  <TableCell>착용 가능 종족</TableCell>
                  <TableCell>세공 랭크</TableCell>
                  <TableCell align="right">등장 확률(3줄)</TableCell>
                  <TableCell align="right">평균 시도 횟수</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const filteredResults = results.filter(result => visibleRanks[result.rank]);                  
                  return filteredResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.tool}</TableCell>
                      <TableCell>{result.itemType}</TableCell>
                      <TableCell>{result.race}</TableCell>
                      <TableCell>{result.rank}</TableCell>
                      <TableCell align="right">
                        {(result.probability * 100).toFixed(4)}%
                      </TableCell>
                      <TableCell align="right">
                        {Math.floor(result.expectedTries).toLocaleString()}회
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {selectedOptions.length > 0 && results.length === 0 && (
          <Typography color="error" sx={{ mt: 2 }}>
            선택한 옵션 조합이 가능한 아이템이 없습니다.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default CraftingCalculator;